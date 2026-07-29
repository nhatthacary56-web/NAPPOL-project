/** OTP ในหน่วยความจำของ process + เก็บ ref จาก BoostSMS */

/** @type {Map<string, { code: string | null, ref: string | null, expiresAt: number, channel: string, phoneE164: string }>} */
const otpMem = new Map()

export function setMemOtp(
  phone,
  code,
  { ttlMs = 15 * 60 * 1000, channel = 'sms', ref = null, phoneE164 = '' } = {},
) {
  const key = String(phone || '')
  if (!key) return
  const digits = code == null || code === '' ? null : String(code).replace(/\D/g, '')
  otpMem.set(key, {
    code: digits && digits.length ? digits : null,
    ref: ref ? String(ref) : null,
    expiresAt: Date.now() + ttlMs,
    channel,
    phoneE164: phoneE164 || key,
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
  if (!entry || !entry.code) return false
  const got = String(code || '').replace(/\D/g, '')
  if (!got || entry.code !== got) return false
  otpMem.delete(String(phone || ''))
  return true
}

export function clearMemOtp(phone) {
  otpMem.delete(String(phone || ''))
}
