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
  if (!sender) {
    return 'ยังไม่ได้ตั้ง BOOST_SMS_SENDER (ชื่อผู้ส่งที่อนุมัติแล้ว)'
  }
  return null
}

export function getBoostSmsPublicStatus() {
  const key = apiKey()
  const sender = senderNameRaw()
  const configError = getBoostSmsConfigError()
  return {
    configured: Boolean(key),
    sender: looksLikeSecretKey(sender) ? '(ผิดช่อง: ใส่ sk_live ไว้ที่ SENDER)' : sender || '(ยังไม่ตั้ง)',
    keyLooksOk: looksLikeSecretKey(key) && !looksLikeKeyId(key),
    configError,
    baseUrl: BASE,
  }
}

function senderName() {
  const raw = senderNameRaw()
  if (!raw || looksLikeSecretKey(raw)) return 'DeeJa'
  return raw
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

async function boostFetch(path, { method = 'GET', body } = {}) {
  const key = apiKey()
  if (!key) {
    const err = new Error('ยังไม่ได้ตั้งค่า BOOST_SMS_API_KEY')
    err.code = 'NO_KEY'
    throw err
  }
  const configError = getBoostSmsConfigError()
  if (configError) {
    const err = new Error(configError)
    err.code = 'BAD_CONFIG'
    err.status = 400
    throw err
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

export async function sendBoostSms({ recipient, message, sender }) {
  const to = phoneForBoostSms(recipient)
  if (!to || to.length < 10) {
    const err = new Error('เบอร์โทรไม่ถูกต้องสำหรับส่ง SMS')
    err.code = 'BAD_PHONE'
    throw err
  }
  return boostFetch('/api/v1/sms/send', {
    method: 'POST',
    body: {
      recipient: to,
      message: String(message || '').trim(),
      senderName: String(sender || senderName()).trim(),
    },
  })
}

/**
 * ส่งเฉพาะ SMS ธรรมดาที่มีรหัสที่เราสร้างเอง
 * ไม่ใช้ /otp/send ของ BoostSMS (จะได้รหัสคนละตัวกับที่เซิร์ฟเวอร์จำไว้)
 */
export async function sendBoostOtpSms(phone, code, brand = 'DeeJa') {
  const otp = String(code || '').replace(/\D/g, '')
  const message = `${brand} OTP: ${otp} (ใช้ได้ 15 นาที) ห้ามบอกผู้อื่น`
  await sendBoostSms({ recipient: phone, message })
  return { channel: 'sms' }
}
