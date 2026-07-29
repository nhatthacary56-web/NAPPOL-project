/** OTP ในหน่วยความจำของ process — กันเคส persist/รีโหลดแล้วรหัสหายหรือคนละชุดกับ SMS */

/** @type {Map<string, { code: string, expiresAt: number, channel: string }>} */
const otpMem = new Map()

export function setMemOtp(phone, code, { ttlMs = 15 * 60 * 1000, channel = 'sms' } = {}) {
  const key = String(phone || '')
  if (!key) return
  otpMem.set(key, {
    code: String(code || '').replace(/\D/g, ''),
    expiresAt: Date.now() + ttlMs,
    channel,
  })
}

export function peekMemOtp(phone) {
  const key = String(phone || '')
  const entry = otpMem.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    otpMem.delete(key)
    return null
  }
  return entry
}

export function consumeMemOtp(phone, code) {
  const entry = peekMemOtp(phone)
  if (!entry) return false
  const got = String(code || '').replace(/\D/g, '')
  if (!got || entry.code !== got) return false
  otpMem.delete(String(phone || ''))
  return true
}

export function clearMemOtp(phone) {
  otpMem.delete(String(phone || ''))
}
