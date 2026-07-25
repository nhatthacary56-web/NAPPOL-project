import { Router } from 'express'
import {
  createId,
  creditShopPending,
  getDb,
  getShopById,
  getShopByOwner,
  persist,
  pushNotification,
  releaseShopPending,
  reverseShopPending,
} from '../db.js'
import { requireAuth } from '../auth.js'
import { createShipmentForOrder, getShipmentLabels, isZortConfigured } from '../zort.js'

const router = Router()

function restoreStock(order) {
  const db = getDb()
  for (const item of order.items) {
    const product = db.products.find((p) => p.id === item.productId)
    if (!product) continue
    product.stock = (product.stock || 0) + item.qty
    product.sold = Math.max(0, (product.sold || 0) - item.qty)
    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((v) => v.id === item.variantId)
      if (variant) variant.stock = (variant.stock || 0) + item.qty
    }
  }
}

function ensureSettlements(order) {
  if (order.settlements) return
  const db = getDb()
  const rate = db.settings?.commissionRate ?? 0.05
  const settlements = {}
  const shopIds = [...new Set(order.items.map((i) => i.shopId))]
  for (const shopId of shopIds) {
    const items = order.items.filter((i) => i.shopId === shopId)
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const shareDiscount =
      order.subtotal > 0 ? (subtotal / order.subtotal) * (order.discount || 0) : 0
    const gross = Math.max(0, Math.round(subtotal - shareDiscount))
    const fee = Math.round(gross * rate)
    const net = Math.max(0, gross - fee)
    settlements[shopId] = { gross, fee, net, status: 'none' }
  }
  order.settlements = settlements
}

function creditPending(order) {
  ensureSettlements(order)
  for (const [shopId, s] of Object.entries(order.settlements)) {
    if (s.status === 'none') {
      creditShopPending(shopId, s.net)
      s.status = 'pending'
    }
  }
}

function releaseSettlements(order) {
  ensureSettlements(order)
  for (const [shopId, s] of Object.entries(order.settlements)) {
    if (s.status === 'pending') {
      releaseShopPending(shopId, s.net)
      s.status = 'released'
    }
  }
}

function reverseSettlements(order) {
  for (const [shopId, s] of Object.entries(order.settlements || {})) {
    if (s.status === 'pending') {
      reverseShopPending(shopId, s.net)
      s.status = 'reversed'
    }
  }
}

router.get('/seller/earnings', requireAuth, (req, res) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  const db = getDb()
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.json({ ok: true, rows: [], totals: { gross: 0, fee: 0, net: 0 } })
  const rows = []
  for (const order of db.orders) {
    const s = order.settlements?.[shop.id]
    if (!s) continue
    rows.push({
      orderId: order.id,
      createdAt: order.createdAt,
      orderStatus: order.status,
      settlementStatus: s.status,
      gross: s.gross,
      fee: s.fee,
      net: s.net,
    })
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.gross
      acc.fee += r.fee
      acc.net += r.net
      return acc
    },
    { gross: 0, fee: 0, net: 0 },
  )
  res.json({ ok: true, rows, totals })
})

router.get('/mine', requireAuth, (req, res) => {
  const db = getDb()
  const orders = db.orders
    .filter((o) => o.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ ok: true, orders })
})

router.get('/seller', requireAuth, (req, res) => {
  const db = getDb()
  if (req.user.role === 'admin') {
    return res.json({
      ok: true,
      orders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    })
  }
  if (req.user.role !== 'seller') {
    return res.status(403).json({ ok: false, message: 'สำหรับผู้ขายเท่านั้น' })
  }
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.json({ ok: true, orders: [] })
  const orders = db.orders
    .filter((o) => o.items.some((i) => i.shopId === shop.id))
    .map((o) => ({
      ...o,
      items: o.items.filter((i) => i.shopId === shop.id),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ ok: true, orders })
})

router.get('/zort/status', requireAuth, (_req, res) => {
  res.json({
    ok: true,
    configured: isZortConfigured(),
    defaultShipment: process.env.ZORT_DEFAULT_SHIPMENT || 'flashexpress',
  })
})

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ ok: false, message: 'ไม่พบคำสั่งซื้อ' })

  if (req.user.role === 'admin' || order.userId === req.user.id) {
    return res.json({ ok: true, order })
  }

  if (req.user.role === 'seller') {
    const shop = getShopByOwner(req.user.id)
    if (shop && order.items.some((i) => i.shopId === shop.id)) {
      return res.json({
        ok: true,
        order: { ...order, items: order.items.filter((i) => i.shopId === shop.id) },
      })
    }
  }

  return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์ดูออเดอร์นี้' })
})

router.post('/checkout', requireAuth, (req, res) => {
  const db = getDb()
  const { items, addressId, paymentMethod = 'cod', voucherCode } = req.body ?? {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, message: 'ไม่มีสินค้าในคำสั่งซื้อ' })
  }

  const address = db.addresses.find((a) => a.id === addressId && a.userId === req.user.id)
  if (!address) {
    return res.status(400).json({ ok: false, message: 'กรุณาเลือกที่อยู่จัดส่ง' })
  }

  const voucher = voucherCode
    ? db.vouchers.find((v) => v.code === String(voucherCode).toUpperCase() && v.active)
    : null
  if (voucherCode) {
    if (!voucher) {
      return res.status(400).json({ ok: false, message: 'คูปองไม่ถูกต้องหรือหมดอายุ' })
    }
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      return res.status(400).json({ ok: false, message: 'คูปองหมดอายุแล้ว' })
    }
    const uv = (db.userVouchers || []).find(
      (row) => row.userId === req.user.id && row.code === voucher.code,
    )
    if (!uv) {
      return res.status(400).json({ ok: false, message: 'กรุณาเก็บคูปองก่อนใช้งาน' })
    }
    if (uv.usedAt) {
      return res.status(400).json({ ok: false, message: 'คูปองนี้ถูกใช้ไปแล้ว' })
    }
  }

  const orderItems = []
  for (const line of items) {
    const product = db.products.find((p) => p.id === line.productId && p.status === 'active')
    if (!product) {
      return res.status(400).json({ ok: false, message: `สินค้าไม่พร้อมจำหน่าย: ${line.productId}` })
    }
    const shop = getShopById(product.shopId)
    if (!shop || shop.status !== 'active') {
      return res.status(400).json({ ok: false, message: `ร้านของสินค้า ${product.name} ยังไม่พร้อม` })
    }
    const qty = Math.max(1, Number(line.qty) || 1)
    const variants = Array.isArray(product.variants) ? product.variants : []
    let variant = null
    if (line.variantId) {
      variant = variants.find((v) => v.id === line.variantId)
      if (!variant) {
        return res.status(400).json({ ok: false, message: `ไม่พบตัวเลือกของ ${product.name}` })
      }
    } else if (variants.length > 0) {
      return res.status(400).json({
        ok: false,
        message: `กรุณาเลือกตัวเลือกสินค้า: ${product.name}`,
      })
    }

    const stock = variant
      ? Number(variant.stock) || 0
      : typeof product.stock === 'number'
        ? product.stock
        : 0
    if (stock < qty) {
      return res.status(400).json({
        ok: false,
        message: `${product.name}${variant ? ` (${variant.name})` : ''} สต็อกไม่พอ (เหลือ ${stock})`,
      })
    }

    const unitPrice =
      variant && variant.price != null && variant.price !== ''
        ? Number(variant.price)
        : product.price

    orderItems.push({
      productId: product.id,
      shopId: product.shopId,
      name: product.name,
      image: product.image,
      price: unitPrice,
      qty,
      variantId: variant?.id || null,
      variantName: variant?.name || null,
    })
  }

  // commit stock
  for (const item of orderItems) {
    const product = db.products.find((p) => p.id === item.productId)
    product.stock = Math.max(0, (product.stock || 0) - item.qty)
    product.sold = (product.sold || 0) + item.qty
    if (item.variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find((v) => v.id === item.variantId)
      if (variant) variant.stock = Math.max(0, (variant.stock || 0) - item.qty)
    }
  }

  const grandSubtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0)
  const freeMin = db.settings?.freeShippingMin ?? 199
  const shipFee = db.settings?.shippingFee ?? 40
  const grandShipping = grandSubtotal >= freeMin ? 0 : shipFee
  const grandDiscount =
    voucher && grandSubtotal >= voucher.minSpend
      ? Math.min(voucher.discount, grandSubtotal + grandShipping)
      : 0

  // one order per shop
  const byShop = new Map()
  for (const item of orderItems) {
    if (!byShop.has(item.shopId)) byShop.set(item.shopId, [])
    byShop.get(item.shopId).push(item)
  }

  const status = paymentMethod === 'cod' ? 'to_ship' : 'unpaid'
  const settings = db.settings
  const created = []
  let shippingAssigned = false
  let discountLeft = grandDiscount
  const shopEntries = [...byShop.entries()]

  shopEntries.forEach(([shopId, shopItems], index) => {
    const subtotal = shopItems.reduce((s, i) => s + i.price * i.qty, 0)
    const share =
      grandSubtotal > 0 ? subtotal / grandSubtotal : 1 / Math.max(1, shopEntries.length)
    let discount = Math.round(grandDiscount * share)
    if (index === shopEntries.length - 1) discount = discountLeft
    else discountLeft -= discount
    const shippingFee = !shippingAssigned ? grandShipping : 0
    if (!shippingAssigned && grandShipping > 0) shippingAssigned = true
    const total = Math.max(0, subtotal + shippingFee - discount)

    const order = {
      id: createId('ord'),
      userId: req.user.id,
      createdAt: new Date().toISOString(),
      status,
      items: shopItems,
      subtotal,
      shippingFee,
      discount,
      total,
      address: { ...address },
      paymentMethod,
      voucherCode: voucher?.code,
      trackingNumber: null,
      carrier: null,
      shippedAt: null,
      payment:
        paymentMethod === 'cod'
          ? { status: 'cod', paidAt: null }
          : {
              status: 'pending',
              paidAt: null,
              promptPay: {
                phone: settings.promptPayPhone,
                amount: total,
                ref: createId('pay'),
              },
              bankAccount: settings.bankAccount,
            },
    }

    ensureSettlements(order)
    if (status === 'to_ship') creditPending(order)
    db.orders.unshift(order)
    created.push(order)

    pushNotification(req.user.id, {
      type: 'order',
      title: status === 'unpaid' ? 'รอชำระเงิน' : 'คำสั่งซื้อสำเร็จ',
      body: `ออเดอร์ ${order.id} ยอด ฿${total.toLocaleString('th-TH')}`,
      link: `/orders/${order.id}`,
    })

    const shop = getShopById(shopId)
    if (shop) {
      pushNotification(shop.ownerId, {
        type: 'order',
        title: 'มีออเดอร์ใหม่',
        body: `ออเดอร์ ${order.id} จากลูกค้า`,
        link: '/seller/orders',
      })
    }
  })

  if (voucher) {
    const uv = (db.userVouchers || []).find(
      (row) => row.userId === req.user.id && row.code === voucher.code,
    )
    if (uv) uv.usedAt = new Date().toISOString()
  }

  const user = db.users.find((u) => u.id === req.user.id)
  if (user) user.coins = (user.coins || 0) + 5

  persist()
  res.status(201).json({
    ok: true,
    orders: created,
    order: created[0],
    orderIds: created.map((o) => o.id),
  })
})

router.post('/:id/pay', requireAuth, (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ ok: false, message: 'ไม่พบคำสั่งซื้อ' })
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  if (order.status !== 'unpaid') {
    return res.status(400).json({ ok: false, message: 'ออเดอร์นี้ไม่ต้องชำระแล้ว' })
  }

  const method = req.body?.method || order.paymentMethod
  const slipNote = String(req.body?.slipNote || '').trim()

  order.status = 'to_ship'
  order.payment = {
    ...(order.payment || {}),
    status: 'paid',
    paidAt: new Date().toISOString(),
    method,
    note: slipNote || (method === 'card' ? 'ชำระบัตรจำลองสำเร็จ' : 'ยืนยันโอนเงินจำลองสำเร็จ'),
    history: [
      ...((order.payment && order.payment.history) || []),
      {
        at: new Date().toISOString(),
        event: 'paid',
        method,
        note: slipNote || 'ชำระเงินสำเร็จ',
      },
    ],
  }

  creditPending(order)

  pushNotification(order.userId, {
    type: 'order',
    title: 'ชำระเงินสำเร็จ',
    body: `ออเดอร์ ${order.id} ร้านกำลังเตรียมจัดส่ง`,
    link: `/orders/${order.id}`,
  })

  const shopIds = [...new Set(order.items.map((i) => i.shopId))]
  for (const shopId of shopIds) {
    const shop = getShopById(shopId)
    if (shop) {
      pushNotification(shop.ownerId, {
        type: 'order',
        title: 'ลูกค้าชำระเงินแล้ว',
        body: `ออเดอร์ ${order.id} พร้อมแพ็กของ`,
        link: '/seller/orders',
      })
    }
  }

  persist()
  res.json({ ok: true, order })
})

router.patch('/:id/status', requireAuth, (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ ok: false, message: 'ไม่พบคำสั่งซื้อ' })

  const { status, trackingNumber, carrier } = req.body ?? {}
  const allowed = [
    'unpaid',
    'to_ship',
    'shipping',
    'to_review',
    'completed',
    'cancelled',
    'refunded',
  ]
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
  }

  const isOwner = order.userId === req.user.id
  const isAdmin = req.user.role === 'admin'
  const shop = req.user.role === 'seller' ? getShopByOwner(req.user.id) : null
  const isSeller = shop && order.items.some((i) => i.shopId === shop.id)

  if (!isAdmin && !isSeller && !isOwner) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  if (isSeller && !isAdmin) {
    if (order.status === 'unpaid' && status === 'to_ship') {
      return res.status(403).json({
        ok: false,
        message: 'รอลูกค้าชำระเงินก่อน จึงจะจัดส่งได้',
      })
    }
  }

  if (isOwner && !isAdmin && !isSeller) {
    if (
      !(status === 'to_review' && order.status === 'shipping') &&
      !(status === 'completed' && order.status === 'to_review') &&
      !(status === 'cancelled' && ['unpaid', 'to_ship'].includes(order.status)) &&
      !(status === 'to_ship' && order.status === 'unpaid')
    ) {
      return res.status(403).json({ ok: false, message: 'ลูกค้าเปลี่ยนสถานะนี้ไม่ได้' })
    }
  }

  if (status === 'shipping' && (isSeller || isAdmin)) {
    const track = String(trackingNumber || order.trackingNumber || '').trim()
    if (!track) {
      return res.status(400).json({
        ok: false,
        message: 'กรุณากรอกเลขพัสดุก่อนจัดส่ง',
      })
    }
    order.trackingNumber = track
    order.carrier = String(carrier || order.carrier || 'Kerry Express').trim()
    order.shippedAt = new Date().toISOString()
  }

  const prev = order.status
  if (status === 'cancelled' && prev !== 'cancelled' && ['unpaid', 'to_ship'].includes(prev)) {
    restoreStock(order)
    if (prev === 'to_ship') reverseSettlements(order)
  }

  order.status = status

  if (status === 'to_review' || status === 'completed') {
    releaseSettlements(order)
  }

  const labels = {
    unpaid: 'รอชำระเงิน',
    to_ship: 'กำลังเตรียมจัดส่ง',
    shipping: 'กำลังจัดส่ง',
    to_review: 'ได้รับสินค้าแล้ว กรุณารีวิว',
    completed: 'ออเดอร์เสร็จสมบูรณ์',
    cancelled: 'ออเดอร์ถูกยกเลิก',
  }

  let body = `ออเดอร์ ${order.id}: ${labels[status] || status}`
  if (status === 'shipping' && order.trackingNumber) {
    body += ` · ${order.carrier} ${order.trackingNumber}`
  }

  pushNotification(order.userId, {
    type: 'order',
    title: 'อัปเดตสถานะคำสั่งซื้อ',
    body,
    link: `/orders/${order.id}`,
  })

  persist()
  res.json({ ok: true, order })
})

router.post('/:id/zort/ship', requireAuth, async (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ ok: false, message: 'ไม่พบคำสั่งซื้อ' })

  if (!isZortConfigured()) {
    return res.status(503).json({
      ok: false,
      message: 'ยังไม่ได้ตั้งค่า ZORT บนเซิร์ฟเวอร์',
    })
  }

  const isAdmin = req.user.role === 'admin'
  const shop = req.user.role === 'seller' ? getShopByOwner(req.user.id) : null
  const isSeller = shop && order.items.some((i) => i.shopId === shop.id)
  if (!isAdmin && !isSeller) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์เรียกขนส่ง' })
  }
  if (order.status === 'unpaid') {
    return res.status(400).json({ ok: false, message: 'รอลูกค้าชำระเงินก่อนจัดส่ง' })
  }
  if (!['to_ship', 'shipping'].includes(order.status)) {
    return res.status(400).json({ ok: false, message: 'สถานะออเดอร์นี้เรียกขนส่งไม่ได้' })
  }

  const force = Boolean(req.body?.force)
  if (order.trackingNumber && !force) {
    return res.json({
      ok: true,
      order,
      message: 'ออเดอร์นี้มีเลขพัสดุแล้ว',
    })
  }

  const carrier = String(req.body?.carrier || order.carrier || 'Flash Express')
  const owner = shop ? db.users.find((u) => u.id === shop.ownerId) : null
  const shopProfile = shop
    ? {
        name: shop.name,
        phone: owner?.phone || '',
        email: owner?.email || '',
        address: shop.location || '',
        province: '',
        district: '',
        city: '',
        postcode: '',
      }
    : undefined

  try {
    const shipped = await createShipmentForOrder(order, { carrier, shopProfile })
    if (!shipped.trackingNumber) {
      return res.status(502).json({
        ok: false,
        message: 'ZORT สร้างออเดอร์แล้ว แต่ยังไม่มีเลข Tracking',
        detail: shipped,
      })
    }

    order.zortOrderId = shipped.zortOrderId
    order.zortOrderNumber = shipped.zortOrderNumber
    order.trackingNumber = shipped.trackingNumber
    order.carrier = shipped.carrier
    order.shippingLabelUrl = shipped.shippingLabelUrl || order.shippingLabelUrl || null
    order.status = 'shipping'
    order.shippedAt = new Date().toISOString()

    pushNotification(order.userId, {
      type: 'order',
      title: 'อัปเดตสถานะคำสั่งซื้อ',
      body: `ออเดอร์ ${order.id}: กำลังจัดส่ง · ${order.carrier} ${order.trackingNumber}`,
      link: `/orders/${order.id}`,
    })

    persist()
    res.json({
      ok: true,
      order,
      message: `ได้เลขพัสดุ ${order.trackingNumber} · พิมพ์ใบปะหน้าได้ที่ /orders/${order.id}/label`,
      printPath: `/orders/${order.id}/label`,
    })
  } catch (error) {
    res.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'เรียก ZORT ไม่สำเร็จ',
      code: error.code,
      detail: error.detail || undefined,
    })
  }
})

router.get('/:id/zort/label', requireAuth, async (req, res) => {
  const db = getDb()
  const order = db.orders.find((o) => o.id === req.params.id)
  if (!order) return res.status(404).json({ ok: false, message: 'ไม่พบคำสั่งซื้อ' })

  const isAdmin = req.user.role === 'admin'
  const isOwner = order.userId === req.user.id
  const shop = req.user.role === 'seller' ? getShopByOwner(req.user.id) : null
  const isSeller = shop && order.items.some((i) => i.shopId === shop.id)
  if (!isAdmin && !isSeller && !isOwner) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  if (!order.zortOrderId && !order.zortOrderNumber) {
    return res.status(400).json({ ok: false, message: 'ออเดอร์นี้ยังไม่ได้ส่งเข้า ZORT' })
  }

  try {
    const labels = await getShipmentLabels(order)
    if (labels.shippingLabelUrl) {
      order.shippingLabelUrl = labels.shippingLabelUrl
      persist()
    }
    res.json({
      ok: true,
      order,
      shippingLabelUrl: order.shippingLabelUrl,
      labels: labels.labels,
    })
  } catch (error) {
    res.status(502).json({
      ok: false,
      message: error instanceof Error ? error.message : 'ดึงใบปะหน้าไม่สำเร็จ',
    })
  }
})

export default router
