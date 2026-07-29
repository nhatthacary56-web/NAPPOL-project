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

/** แปลงเป็นรูปแบบที่ SMS gateway มักรับ: 08xxxxxxxx */
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
      json?.detail ||
      (typeof json?.raw === 'string' && json.raw) ||
      `BoostSMS HTTP ${res.status}`
    const err = new Error(String(msg))
    err.status = res.status
    err.detail = json
    throw err
  }
  return json
}

/**
 * ส่ง SMS ทั่วไป — ตามตัวอย่าง SDK: recipient / message / senderName
 */
export async function sendBoostSms({ recipient, message, sender }) {
  const to = phoneForBoostSms(recipient)
  if (!to || to.length < 9) {
    const err = new Error('เบอร์โทรไม่ถูกต้อง')
    err.code = 'BAD_PHONE'
    throw err
  }
  const payload = {
    recipient: to,
    message: String(message || '').trim(),
    senderName: String(sender || senderName()).trim(),
  }
  try {
    return await boostFetch('/api/v1/sms/send', { method: 'POST', body: payload })
  } catch (first) {
    // ลองชื่อฟิลด์สำรองถ้า API ใช้คนละชื่อ
    if (first.status === 400) {
      try {
        return await boostFetch('/api/v1/sms/send', {
          method: 'POST',
          body: {
            phone: to,
            to,
            text: payload.message,
            message: payload.message,
            sender: payload.senderName,
            senderName: payload.senderName,
            from: payload.senderName,
          },
        })
      } catch {
        throw first
      }
    }
    throw first
  }
}

/** ส่งรหัส OTP ผ่าน SMS (เราเจนรหัสเอง แล้ว verify ในเซิร์ฟเวอร์เรา) */
export async function sendBoostOtpSms(phone, code, brand = 'DeeJa') {
  const message = `${brand}: รหัส OTP ของคุณคือ ${code} (ใช้ได้ 5 นาที) ห้ามบอกผู้อื่น`
  // ลอง OTP endpoint ก่อน ถ้าไม่มี/พัง ค่อย sms/send
  const to = phoneForBoostSms(phone)
  try {
    return await boostFetch('/api/v1/otp/send', {
      method: 'POST',
      body: {
        recipient: to,
        phone: to,
        code: String(code),
        otp: String(code),
        message,
        senderName: senderName(),
      },
    })
  } catch (otpErr) {
    // 404/405 = ไม่มี endpoint แบบนี้ → ใช้ sms/send
    if (otpErr.status === 404 || otpErr.status === 405) {
      return sendBoostSms({ recipient: to, message })
    }
    // บางระบบ otp/send ไม่รับ code (เจนเอง) — fallback ส่งข้อความเอง
    try {
      return await sendBoostSms({ recipient: to, message })
    } catch {
      throw otpErr
    }
  }
}

export async function getBoostBalance() {
  return boostFetch('/api/v1/balance')
}
