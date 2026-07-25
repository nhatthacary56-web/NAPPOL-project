import { randomUUID } from 'node:crypto'

const BASE = 'https://open-api.zortout.com/v4'

export function isZortConfigured() {
  return Boolean(
    process.env.ZORT_STORENAME && process.env.ZORT_API_KEY && process.env.ZORT_API_SECRET,
  )
}

function zortHeaders(extra = {}) {
  if (!isZortConfigured()) {
    const err = new Error('ยังไม่ได้ตั้งค่า ZORT (ZORT_STORENAME / ZORT_API_KEY / ZORT_API_SECRET)')
    err.code = 'ZORT_NOT_CONFIGURED'
    throw err
  }
  return {
    storename: String(process.env.ZORT_STORENAME).trim(),
    apikey: String(process.env.ZORT_API_KEY).trim(),
    apisecret: String(process.env.ZORT_API_SECRET).trim(),
    'Content-Type': 'application/json',
    'X-Request-ID': randomUUID(),
    ...extra,
  }
}

async function zortRequest(method, path, { query, body, headerExtras } = {}) {
  const url = new URL(`${BASE}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  const res = await fetch(url, {
    method,
    headers: zortHeaders(headerExtras),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    const err = new Error(`ZORT ตอบกลับไม่ใช่ JSON (${res.status})`)
    err.code = 'ZORT_BAD_RESPONSE'
    err.raw = text.slice(0, 500)
    throw err
  }
  const code = String(json?.res?.resCode ?? json?.resCode ?? res.status)
  if (!res.ok || (code && code !== '200')) {
    const desc = json?.res?.resDesc || json?.resDesc || json?.message || `ZORT error ${code}`
    const err = new Error(desc)
    err.code = 'ZORT_API'
    err.resCode = code
    err.detail = json
    throw err
  }
  return json
}

/** Map UI carrier label -> ZORT shipment code */
export function toZortShipment(carrier) {
  const raw = String(carrier || '').toLowerCase().replace(/\s+/g, '')
  if (raw.includes('flash')) return 'flashexpress'
  if (raw.includes('j&t') || raw.includes('jt')) return 'jtexpress'
  if (raw.includes('kerry')) return 'kerry'
  if (raw.includes('post') || raw.includes('ไปรษณีย์')) return 'thailandpost'
  if (raw.includes('dhl')) return 'dhl'
  if (raw.includes('spx') || raw.includes('shopee')) return 'shopeeexpress'
  // Kerry is registered on this ZORT store; Flash is not.
  return String(process.env.ZORT_DEFAULT_SHIPMENT || 'kerry').toLowerCase()
}

export function carrierLabelFromZort(code) {
  const map = {
    flashexpress: 'Flash Express',
    jtexpress: 'J&T Express',
    kerry: 'Kerry Express',
    thailandpost: 'Thai Post',
    dhl: 'DHL',
    shopeeexpress: 'Shopee Express',
  }
  return map[String(code || '').toLowerCase()] || code || 'ZORT'
}

function fullAddress(address) {
  return [address.line1, address.district, address.province, address.postalCode]
    .filter(Boolean)
    .join(' ')
}

function orderNumberFor(order) {
  return order.zortOrderNumber || `GA-${order.id}`
}

export function buildZortOrderPayload(order) {
  const number = orderNumberFor(order)
  const amount = Number(order.total) || 0
  const shippingamount = Number(order.shippingFee) || 0
  const list = (order.items || []).map((item, index) => {
    const qty = Math.max(1, Number(item.qty) || 1)
    const price = Number(item.price) || 0
    const sku = String(item.variantId || item.productId || `ITEM-${index + 1}`).slice(0, 64)
    const name = String(item.variantName ? `${item.name} (${item.variantName})` : item.name).slice(
      0,
      200,
    )
    return {
      sku,
      name,
      number: qty,
      pricepernumber: price,
      discount: '0',
      totalprice: Math.round(price * qty * 100) / 100,
      producttype: 0,
    }
  })

  if (!list.length) {
    list.push({
      sku: 'SHIPPING',
      name: 'พัสดุจัดส่ง',
      number: 1,
      pricepernumber: amount,
      discount: '0',
      totalprice: amount,
      producttype: 1,
    })
  }

  const addr = order.address || {}
  const isCod = order.paymentMethod === 'cod'
  return {
    number,
    orderdate: (order.createdAt || new Date().toISOString()).slice(0, 10),
    amount,
    shippingamount,
    vatamount: 0,
    vattype: 1,
    status: isCod ? 'Pending' : 'Success',
    reference: order.id,
    saleschannel: 'Great App',
    customercode: order.userId,
    customername: addr.name || 'ลูกค้า',
    customerphone: addr.phone || '',
    customeraddress: fullAddress(addr),
    shippingname: addr.name || 'ลูกค้า',
    shippingphone: addr.phone || '',
    shippingaddress: fullAddress(addr),
    shippingchannel: '',
    paymentmethod: isCod ? 'COD' : order.paymentMethod === 'card' ? 'Credit Card' : 'Transfer',
    paymentamount: amount,
    isCOD: isCod,
    description: `Great App order ${order.id}`,
    list,
  }
}

export function buildBookShipmentBody(order, shopProfile = {}) {
  const addr = order.address || {}
  // ZORT rejects empty sender fields — fall back to env / safe defaults.
  const senderName =
    shopProfile.name || process.env.ZORT_SENDER_NAME || 'Great App Shop'
  const senderPhone =
    shopProfile.phone || process.env.ZORT_SENDER_PHONE || '0812345678'
  const senderEmail =
    shopProfile.email || process.env.ZORT_SENDER_EMAIL || process.env.ZORT_STORENAME || ''
  const senderAddress =
    shopProfile.address ||
    process.env.ZORT_SENDER_ADDRESS ||
    '99 ถนนพระราม 9'
  const senderDistrict =
    shopProfile.district || process.env.ZORT_SENDER_DISTRICT || 'ห้วยขวาง'
  const senderCity = shopProfile.city || process.env.ZORT_SENDER_CITY || 'ห้วยขวาง'
  const senderProvince =
    shopProfile.province || process.env.ZORT_SENDER_PROVINCE || 'กรุงเทพมหานคร'
  const senderPostcode =
    shopProfile.postcode || process.env.ZORT_SENDER_POSTCODE || '10310'

  return {
    senderName,
    senderPhone,
    senderEmail,
    senderAddress,
    senderDistrict,
    senderCity,
    senderProvince,
    senderPostcode,
    recipientName: addr.name || 'ลูกค้า',
    recipientPhone: addr.phone || '',
    recipientEmail: '',
    recipientAddress: addr.line1 || fullAddress(addr) || 'ที่อยู่จัดส่ง',
    recipientDistrict: addr.district || 'ไม่ระบุ',
    recipientCity: addr.district || 'ไม่ระบุ',
    recipientProvince: addr.province || 'กรุงเทพมหานคร',
    recipientPostcode: addr.postalCode || '10000',
    codAmount: order.paymentMethod === 'cod' ? Number(order.total) || 0 : 0,
    parcelWeight: Number(process.env.ZORT_DEFAULT_WEIGHT_G || 500),
  }
}

export async function findOrderByNumber(number) {
  const json = await zortRequest('GET', '/Order/GetOrders', {
    query: { page: 1, limit: 5 },
    headerExtras: { numberlist: number },
  })
  const list = json?.list || []
  const hit = list.find((o) => String(o.number) === String(number)) || list[0]
  if (!hit) return null
  return {
    zortOrderId: hit.id,
    zortOrderNumber: hit.number,
    trackingNumber: hit.trackingno || hit.trackingList?.[0]?.trackingno || null,
    carrier: carrierLabelFromZort(hit.shippingchannel || hit.trackingList?.[0]?.shippingchannel),
    shippingLabelUrl: null,
    raw: hit,
  }
}

export async function addOrder(order) {
  const payload = buildZortOrderPayload(order)
  try {
    const json = await zortRequest('POST', '/Order/AddOrder', {
      query: { uniquenumber: order.id, link: 0 },
      body: payload,
    })
    return {
      zortOrderId: json?.detail?.id ?? json?.res?.detail?.id,
      zortOrderNumber: payload.number,
      raw: json,
    }
  } catch (error) {
    const msg = String(error.message || '')
    if (/duplicat/i.test(msg) || error.resCode === '100') {
      const existing = await findOrderByNumber(payload.number)
      if (existing?.zortOrderId) {
        return {
          zortOrderId: existing.zortOrderId,
          zortOrderNumber: existing.zortOrderNumber,
          trackingNumber: existing.trackingNumber,
          carrier: existing.carrier,
          reused: true,
          raw: existing.raw,
        }
      }
    }
    throw error
  }
}

export async function bookOrderShipment(order, { shipment, shopProfile } = {}) {
  const shipmentCode = toZortShipment(shipment)
  const id = order.zortOrderId
  const number = orderNumberFor(order)
  const json = await zortRequest('POST', '/Order/BookOrderShipment', {
    query: {
      ...(id ? { id } : { number }),
      shipment: shipmentCode,
      useShippingPoint: false,
      isPickup: false,
    },
    body: buildBookShipmentBody(order, shopProfile),
  })
  const detail = json?.detail || json?.res?.detail || {}
  return {
    trackingNumber: detail.trackingno || null,
    carrier: carrierLabelFromZort(detail.shippingchannel || shipmentCode),
    shippingLabelUrl: detail.link || null,
    zortOrderId: detail.id || id || null,
    zortOrderNumber: detail.number || number,
    raw: json,
  }
}

export async function getShipmentLabels(order) {
  const query = order.zortOrderId
    ? { orderidlist: String(order.zortOrderId) }
    : { numberlist: orderNumberFor(order) }
  const json = await zortRequest('GET', '/Order/GetShipmentLabels', { query })
  const list = Array.isArray(json) ? json : json?.list || json?.detail || []
  const first = Array.isArray(list) ? list[0] : null
  if (!first) return { shippingLabelUrl: null, labels: [], raw: json }
  return {
    shippingLabelUrl: first.linkurl || first.Data || null,
    format: first.Format || first.type || null,
    labels: list,
    raw: json,
  }
}

async function bookWithFallback(order, { carrier, shopProfile }) {
  const preferred = toZortShipment(carrier)
  const fallbacks = [
    preferred,
    'kerry',
    'thailandpost',
    'flashexpress',
    'jtexpress',
  ].filter((v, i, arr) => arr.indexOf(v) === i)

  let lastError
  for (const shipment of fallbacks) {
    try {
      return await bookOrderShipment(order, { shipment, shopProfile })
    } catch (error) {
      lastError = error
      const msg = String(error.message || '')
      // Try next provider when account/integration is missing.
      if (
        /AccountNotRegistered|UnsupportedPartner|NotEnoughPoint|LogisticsGatewayError|Invalid Sender|Invalid Address/i.test(
          msg,
        )
      ) {
        continue
      }
      throw error
    }
  }
  throw lastError || new Error('เรียกขนส่ง ZORT ไม่สำเร็จ')
}

export async function createShipmentForOrder(order, { carrier, shopProfile } = {}) {
  let zortOrderId = order.zortOrderId
  let zortOrderNumber = orderNumberFor(order)
  let existingTracking = order.trackingNumber || null
  let existingCarrier = order.carrier || null

  if (!zortOrderId) {
    const created = await addOrder(order)
    zortOrderId = created.zortOrderId
    zortOrderNumber = created.zortOrderNumber
    if (created.trackingNumber) {
      existingTracking = created.trackingNumber
      existingCarrier = created.carrier
    }
  }

  if (existingTracking) {
    let shippingLabelUrl = order.shippingLabelUrl || null
    try {
      const labels = await getShipmentLabels({
        ...order,
        zortOrderId,
        zortOrderNumber,
      })
      shippingLabelUrl = labels.shippingLabelUrl || shippingLabelUrl
    } catch {
      // ignore
    }
    return {
      zortOrderId,
      zortOrderNumber,
      trackingNumber: existingTracking,
      carrier: existingCarrier || carrierLabelFromZort(toZortShipment(carrier)),
      shippingLabelUrl,
    }
  }

  const booked = await bookWithFallback(
    { ...order, zortOrderId, zortOrderNumber },
    { carrier, shopProfile },
  )

  let shippingLabelUrl = booked.shippingLabelUrl
  if (!shippingLabelUrl) {
    try {
      const labels = await getShipmentLabels({
        ...order,
        zortOrderId: booked.zortOrderId || zortOrderId,
        zortOrderNumber: booked.zortOrderNumber || zortOrderNumber,
      })
      shippingLabelUrl = labels.shippingLabelUrl
    } catch {
      // label may arrive later
    }
  }

  return {
    zortOrderId: booked.zortOrderId || zortOrderId,
    zortOrderNumber: booked.zortOrderNumber || zortOrderNumber,
    trackingNumber: booked.trackingNumber,
    carrier: booked.carrier,
    shippingLabelUrl,
  }
}
