const BASE = 'https://app.boost-sms.com'

function apiKey() {
  return String(process.env.BOOST_SMS_API_KEY || '').trim()
}

function senderName() {
  return String(process.env.BOOST_SMS_SENDER || process.env.BOOST_SMS_SENDER_NAME || 'DeeJa').trim() || 'DeeJa'
}

export function isBoostSmsConfigured() {
  return Boolean(apiKey())
}

export function getBoostSmsPublicStatus() {
  return {
    configured: isBoostSmsConfigured(),
    sender: senderName(),
    baseUrl: BASE,
  }
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

/**
 * ส่ง SMS ตามตัวอย่างเอกสาร:
 * recipient / message / senderName
 */
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

/** ส่ง OTP: ใช้ sms/send เป็นหลัก (เราสร้างรหัสเองแล้ว verify ในเซิร์ฟเรา) */
export async function sendBoostOtpSms(phone, code, brand = 'DeeJa') {
  const message = `${brand}: รหัส OTP ของคุณคือ ${code} (ใช้ได้ 5 นาที) ห้ามบอกผู้อื่น`
  try {
    return await sendBoostSms({ recipient: phone, message })
  } catch (smsErr) {
    // fallback: OTP endpoint ของ BoostSMS (ถ้ารองรับ)
    const to = phoneForBoostSms(phone)
    try {
      return await boostFetch('/api/v1/otp/send', {
        method: 'POST',
        body: {
          recipient: to,
          phone: to,
          message,
          senderName: senderName(),
        },
      })
    } catch {
      throw smsErr
    }
  }
}

export async function getBoostBalance() {
  return boostFetch('/api/v1/balance')
}
