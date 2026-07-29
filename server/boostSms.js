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
    return 'ใส่ Secret Key ผิดช่องที่ BOOST_SMS_SENDER — ช่องนี้ต้องเป็นชื่อผู้ส่งที่อนุมัติใน BoostSMS (เช่น DeeJa) ไม่ใช่ sk_live_...'
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

/** แปลงเป็น 08xxxxxxxx */
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
  const payload = {
    recipient: to,
    message: String(message || '').trim(),
    senderName: String(sender || senderName()).trim(),
  }
  return boostFetch('/api/v1/sms/send', { method: 'POST', body: payload })
}

/**
 * ส่ง OTP — ใช้ BoostSMS /otp/send เป็นหลัก (รหัสบนมือถือ = รหัสที่ verify ได้)
 * ถ้าไม่สำเร็จ ค่อยส่งข้อความเองด้วยรหัสที่เราสร้าง
 */
export async function sendBoostOtpSms(phone, code, brand = 'DeeJa') {
  const to = phoneForBoostSms(phone)
  try {
    await boostFetch('/api/v1/otp/send', {
      method: 'POST',
      body: {
        recipient: to,
        phone: to,
        senderName: senderName(),
      },
    })
    return { channel: 'boost_otp' }
  } catch (otpErr) {
    if (otpErr.code === 'BAD_CONFIG' || otpErr.code === 'NO_KEY') throw otpErr
    const message = `${brand}: รหัส OTP ของคุณคือ ${code} ใช้ได้ 5 นาที ห้ามบอกผู้อื่น`
    await sendBoostSms({ recipient: phone, message })
    return { channel: 'sms' }
  }
}

/** ยืนยันรหัสกับ BoostSMS โดยตรง */
export async function verifyBoostOtp(phone, code) {
  const to = phoneForBoostSms(phone)
  const otp = String(code || '').replace(/\D/g, '')
  if (!to || !otp) {
    const err = new Error('เบอร์หรือรหัสไม่ครบ')
    err.status = 400
    throw err
  }
  const attempts = [
    { recipient: to, code: otp },
    { phone: to, code: otp },
    { recipient: to, otp },
    { phone: to, otp },
  ]
  let lastErr = null
  for (const body of attempts) {
    try {
      return await boostFetch('/api/v1/otp/verify', { method: 'POST', body })
    } catch (error) {
      lastErr = error
      if (error.status === 401 || error.status === 403) continue
      if (error.status === 400) continue
      throw error
    }
  }
  throw lastErr || new Error('ยืนยัน OTP กับ BoostSMS ไม่สำเร็จ')
}

export async function getBoostBalance() {
  return boostFetch('/api/v1/balance')
}
