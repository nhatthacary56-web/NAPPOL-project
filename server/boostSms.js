const BASE = 'https://app.boost-sms.com'

function apiKey() {
  return String(process.env.BOOST_SMS_API_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
}

function senderNameRaw() {
  return String(process.env.BOOST_SMS_SENDER || process.env.BOOST_SMS_SENDER_NAME || '')
    .trim()
    .replace(/^["']|["']$/g, '')
}

function looksLikeSecretKey(value) {
  return /^sk_(live|test)_/i.test(String(value || ''))
}

function looksLikeKeyId(value) {
  return /^cms[a-z0-9]+$/i.test(String(value || ''))
}

export function isBoostSmsConfigured() {
  return Boolean(apiKey())
}

export function getBoostSmsConfigError() {
  const key = apiKey()
  const sender = senderNameRaw()
  if (!key) return 'ยังไม่ได้ตั้ง BOOST_SMS_API_KEY'
  if (looksLikeKeyId(key)) {
    return 'BOOST_SMS_API_KEY ตอนนี้เหมือน Key ID — ต้องใส่ Secret Key ที่ขึ้นต้น sk_live_...'
  }
  if (!looksLikeSecretKey(key)) {
    return 'BOOST_SMS_API_KEY ควรเป็น Secret Key รูปแบบ sk_live_...'
  }
  if (looksLikeSecretKey(sender)) {
    return 'ใส่ Secret Key ผิดช่องที่ BOOST_SMS_SENDER — ช่องนี้ต้องเป็นชื่อผู้ส่งที่อนุมัติใน BoostSMS ไม่ใช่ sk_live_...'
  }
  // sender ว่างได้ — ระบบจะดึงจาก /senders อัตโนมัติ
  return null
}

function extractSenderNames(payload) {
  const list = []
  const push = (v) => {
    const s = String(v || '').trim()
    if (s && !looksLikeSecretKey(s)) list.push(s)
  }
  if (!payload) return list
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (typeof item === 'string') push(item)
      else if (item && typeof item === 'object') {
        push(item.name || item.senderName || item.sender || item.id || item.value)
      }
    }
  } else if (typeof payload === 'object') {
    const arr =
      payload.senders ||
      payload.data ||
      payload.items ||
      payload.results ||
      payload.list ||
      null
    if (Array.isArray(arr)) return extractSenderNames(arr)
    push(payload.name || payload.senderName || payload.defaultSender)
  }
  return [...new Set(list)]
}

async function boostFetch(path, { method = 'GET', body, skipConfigCheck = false } = {}) {
  const key = apiKey()
  if (!key) {
    const err = new Error('ยังไม่ได้ตั้งค่า BOOST_SMS_API_KEY')
    err.code = 'NO_KEY'
    throw err
  }
  if (!skipConfigCheck) {
    const configError = getBoostSmsConfigError()
    if (configError) {
      const err = new Error(configError)
      err.code = 'BAD_CONFIG'
      err.status = 400
      throw err
    }
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      json?.error_message ||
      json?.detail ||
      (typeof json?.raw === 'string' && json.raw.slice(0, 200)) ||
      `BoostSMS HTTP ${res.status}`
    const err = new Error(String(msg))
    err.status = res.status
    err.detail = json
    throw err
  }
  return json
}

export async function listBoostSenders() {
  try {
    const json = await boostFetch('/api/v1/senders', { method: 'GET', skipConfigCheck: true })
    return extractSenderNames(json)
  } catch {
    return []
  }
}

/** เลือกชื่อผู้ส่งที่อนุมัติแล้ว — env ก่อน ถ้าไม่ผ่าน/ว่าง ใช้ตัวแรกจาก API */
export async function resolveSenderName() {
  const preferred = senderNameRaw()
  const approved = await listBoostSenders()
  if (preferred && !looksLikeSecretKey(preferred)) {
    if (approved.length === 0 || approved.some((s) => s.toLowerCase() === preferred.toLowerCase())) {
      return preferred
    }
  }
  if (approved.length > 0) return approved[0]
  if (preferred && !looksLikeSecretKey(preferred)) return preferred
  return ''
}

export async function getBoostSmsPublicStatus() {
  const key = apiKey()
  const sender = senderNameRaw()
  const configError = getBoostSmsConfigError()
  const approvedSenders = key && !configError ? await listBoostSenders() : []
  let resolvedSender = sender
  try {
    if (key && !configError) resolvedSender = (await resolveSenderName()) || sender
  } catch {
    /* ignore */
  }
  return {
    configured: Boolean(key),
    sender: looksLikeSecretKey(sender)
      ? '(ผิดช่อง: ใส่ sk_live ไว้ที่ SENDER)'
      : sender || '(ยังไม่ตั้ง — จะใช้ตัวที่อนุมัติอัตโนมัติ)',
    resolvedSender: resolvedSender || null,
    approvedSenders,
    keyLooksOk: looksLikeSecretKey(key) && !looksLikeKeyId(key),
    configError,
    baseUrl: BASE,
  }
}

/** 08xxxxxxxx */
export function phoneForBoostSms(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('66') && digits.length >= 11) return `0${digits.slice(2)}`
  if (digits.length === 9 && digits.startsWith('8')) return `0${digits}`
  if (digits.startsWith('0')) return digits
  return digits
}

function mapSendError(error) {
  const msg = String(error?.message || '')
  if (/sender|ผู้ส่ง|อนุมัติ|approved|not.?allow|unauthorized.?sender/i.test(msg)) {
    return 'ชื่อผู้ส่งยังไม่ได้รับการอนุมัติใน BoostSMS — ตั้ง BOOST_SMS_SENDER ให้ตรงกับชื่อที่อนุมัติแล้ว (ดูได้ที่หน้า Senders ใน BoostSMS) หรือปล่อยว่างให้ระบบเลือกให้อัตโนมัติ'
  }
  return msg
}

export async function sendBoostSms({ recipient, message, sender }) {
  const to = phoneForBoostSms(recipient)
  if (!to || to.length < 10) {
    const err = new Error('เบอร์โทรไม่ถูกต้องสำหรับส่ง SMS')
    err.code = 'BAD_PHONE'
    throw err
  }
  const senderName = String(sender || (await resolveSenderName()) || '').trim()
  if (!senderName) {
    const err = new Error(
      'ไม่พบชื่อผู้ส่งที่อนุมัติ — ไปที่ BoostSMS ขออนุมัติ Sender แล้วใส่ BOOST_SMS_SENDER ให้ตรงชื่อนั้น',
    )
    err.code = 'NO_SENDER'
    err.status = 400
    throw err
  }

  try {
    return await boostFetch('/api/v1/sms/send', {
      method: 'POST',
      body: {
        recipient: to,
        message: String(message || '').trim(),
        senderName,
      },
    })
  } catch (error) {
    // ถ้าชื่อจาก env ไม่ผ่าน ลองตัวแรกที่ API บอกว่ามี
    const approved = await listBoostSenders()
    const fallback = approved.find((s) => s.toLowerCase() !== senderName.toLowerCase())
    if (fallback && /sender|ผู้ส่ง|อนุมัติ|approved/i.test(String(error.message || ''))) {
      return boostFetch('/api/v1/sms/send', {
        method: 'POST',
        body: {
          recipient: to,
          message: String(message || '').trim(),
          senderName: fallback,
        },
      })
    }
    const err = new Error(mapSendError(error))
    err.status = error.status
    err.detail = error.detail
    err.code = error.code
    throw err
  }
}

/**
 * ส่งเฉพาะ SMS ธรรมดาที่มีรหัสที่เราสร้างเอง
 */
export async function sendBoostOtpSms(phone, code, brand = 'DeeJa') {
  const otp = String(code || '').replace(/\D/g, '')
  const message = `${brand} OTP: ${otp} (ใช้ได้ 15 นาที) ห้ามบอกผู้อื่น`
  await sendBoostSms({ recipient: phone, message })
  return { channel: 'sms' }
}
