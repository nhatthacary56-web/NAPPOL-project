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
  return null
}

function extractSenderNames(payload) {
  const list = []
  const push = (v) => {
    const s = String(v || '').trim()
    if (s && !looksLikeSecretKey(s) && s.length < 40) list.push(s)
  }
  const walk = (node, depth = 0) => {
    if (node == null || depth > 5) return
    if (typeof node === 'string') {
      push(node)
      return
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    if (typeof node === 'object') {
      push(node.name || node.senderName || node.sender || node.sender_id || node.senderId)
      for (const [k, v] of Object.entries(node)) {
        if (/sender|name/i.test(k)) walk(v, depth + 1)
        else if (Array.isArray(v) || (v && typeof v === 'object')) walk(v, depth + 1)
      }
    }
  }
  walk(payload)
  return [...new Set(list.filter(Boolean))]
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

export async function listBoostSendersDetailed() {
  const paths = ['/api/v1/senders', '/api/v1/sender', '/api/v1/account/senders']
  const tried = []
  for (const path of paths) {
    try {
      const json = await boostFetch(path, { method: 'GET', skipConfigCheck: true })
      const names = extractSenderNames(json)
      tried.push({
        path,
        ok: true,
        names,
        sampleKeys: json && typeof json === 'object' ? Object.keys(json).slice(0, 12) : [],
      })
      if (names.length) return { names, tried, rawKeys: tried[tried.length - 1].sampleKeys }
    } catch (error) {
      tried.push({ path, ok: false, error: error.message || String(error), status: error.status || null })
    }
  }
  return { names: [], tried, rawKeys: [] }
}

export async function listBoostSenders() {
  const detailed = await listBoostSendersDetailed()
  return detailed.names
}

export async function resolveSenderName() {
  const preferred = senderNameRaw()
  const approved = await listBoostSenders()
  // ถ้า env ไม่ตรงรายการที่อนุมัติ — อย่าใช้ (เช่น ค่า BoostSMS)
  if (preferred && !looksLikeSecretKey(preferred)) {
    const hit = approved.find((s) => s.toLowerCase() === preferred.toLowerCase())
    if (hit) return hit
  }
  if (approved.length > 0) {
    // ชอบชื่อจริงมากกว่า Trial
    const nonTrial = approved.find((s) => !/^trial$/i.test(s))
    return nonTrial || approved[0]
  }
  return preferred && !looksLikeSecretKey(preferred) ? preferred : ''
}

export async function getBoostSmsPublicStatus() {
  const key = apiKey()
  const sender = senderNameRaw()
  const configError = getBoostSmsConfigError()
  let approvedSenders = []
  let sendersProbe = null
  let resolvedSender = null
  if (key && !configError) {
    const detailed = await listBoostSendersDetailed()
    approvedSenders = detailed.names
    sendersProbe = detailed.tried
    resolvedSender = (await resolveSenderName()) || null
  }
  return {
    configured: Boolean(key),
    sender: looksLikeSecretKey(sender)
      ? '(ผิดช่อง: ใส่ sk_live ไว้ที่ SENDER)'
      : sender || '(ยังไม่ตั้ง)',
    resolvedSender,
    approvedSenders,
    sendersProbe,
    keyLooksOk: looksLikeSecretKey(key) && !looksLikeKeyId(key),
    configError,
    baseUrl: BASE,
    nextStep:
      approvedSenders.length === 0
        ? 'ไปที่ BoostSMS → Senders สร้าง/รออนุมัติชื่อผู้ส่ง แล้วใส่ BOOST_SMS_SENDER ให้ตรงชื่อนั้นบน Render'
        : preferredSenderHint(sender, resolvedSender),
  }
}

function preferredSenderHint(envSender, resolved) {
  if (envSender && resolved && envSender.toLowerCase() !== resolved.toLowerCase()) {
    return `BOOST_SMS_SENDER=${envSender} ไม่ตรงรายการอนุมัติ — ระบบใช้ ${resolved} แทน (แนะนำตั้งเป็น ${resolved})`
  }
  return null
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

function pickReturnedOtp(payload) {
  const candidates = [
    payload?.otp,
    payload?.code,
    payload?.data?.otp,
    payload?.data?.code,
    payload?.result?.otp,
    payload?.result?.code,
  ]
  for (const c of candidates) {
    const digits = String(c || '').replace(/\D/g, '')
    if (digits.length >= 4 && digits.length <= 8) return digits
  }
  return null
}

function pickRef(payload) {
  const candidates = [
    payload?.ref,
    payload?.id,
    payload?.otpId,
    payload?.otp_id,
    payload?.sessionId,
    payload?.session_id,
    payload?.requestId,
    payload?.request_id,
    payload?.data?.ref,
    payload?.data?.id,
    payload?.data?.otpId,
    payload?.data?.otp_id,
    payload?.data?.sessionId,
    payload?.result?.id,
    payload?.result?.ref,
  ]
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim()
  }
  return null
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
      'ยังไม่มีชื่อผู้ส่งที่อนุมัติ — ตั้ง BOOST_SMS_SENDER เป็นชื่อจาก BoostSMS → Senders เช่น DeeJa',
    )
    err.code = 'NO_SENDER'
    err.status = 400
    throw err
  }

  return boostFetch('/api/v1/sms/send', {
    method: 'POST',
    body: {
      recipient: to,
      message: String(message || '').trim(),
      senderName,
    },
  })
}

/**
 * ส่ง OTP ด้วย BoostSMS /otp/send เป็นหลัก (รหัสบนมือถือ = รหัสที่ /otp/verify ตรวจ)
 * เก็บ ref จาก response ไว้ยืนยันคู่กัน
 */
export async function sendBoostOtpSms(phone, _ignoredLocalCode, brand = 'DeeJa') {
  const to = phoneForBoostSms(phone)
  const sender = await resolveSenderName()
  if (!sender) {
    const err = new Error(
      'ยังไม่มีชื่อผู้ส่งที่อนุมัติ — ตั้ง BOOST_SMS_SENDER=DeeJa (หรือชื่อที่อนุมัติแล้ว)',
    )
    err.code = 'NO_SENDER'
    err.status = 400
    throw err
  }

  const sendBodies = [
    { recipient: to, senderName: sender },
    { phone: to, senderName: sender },
    { recipient: to, phone: to, senderName: sender },
    { recipient: to, sender: sender },
  ]

  let sendRes = null
  let lastErr = null
  for (const body of sendBodies) {
    try {
      sendRes = await boostFetch('/api/v1/otp/send', { method: 'POST', body })
      break
    } catch (error) {
      lastErr = error
    }
  }

  // fallback: sms/send ด้วยรหัสที่เราสร้าง — verify ฝั่งเรา
  if (!sendRes) {
    const localCode = String(Math.floor(100000 + Math.random() * 900000))
    const message = `${brand} OTP: ${localCode} (ใช้ได้ 15 นาที) ห้ามบอกผู้อื่น`
    try {
      await sendBoostSms({ recipient: phone, message, sender })
      return {
        channel: 'sms',
        code: localCode,
        ref: null,
        phone: to,
        sender,
      }
    } catch (smsErr) {
      throw lastErr || smsErr
    }
  }

  return {
    channel: 'boost_otp',
    code: pickReturnedOtp(sendRes), // อาจเป็น null — ต้อง verify ผ่าน BoostSMS
    ref: pickRef(sendRes),
    phone: to,
    sender,
    raw: sendRes,
  }
}

/** ยืนยัน OTP กับ BoostSMS ให้ตรงกับตอน /otp/send */
export async function verifyBoostOtp(phone, code, ref = null) {
  const to = phoneForBoostSms(phone)
  const otp = String(code || '').replace(/\D/g, '')
  if (!to || !otp) {
    const err = new Error('เบอร์หรือรหัสไม่ครบ')
    err.status = 400
    throw err
  }

  const attempts = []
  const base = [
    { recipient: to, code: otp },
    { phone: to, code: otp },
    { recipient: to, otp },
    { phone: to, otp },
    { recipient: to, phone: to, code: otp },
    { recipient: to, phone: to, otp },
  ]
  for (const b of base) {
    attempts.push(b)
    if (ref) {
      attempts.push({ ...b, ref })
      attempts.push({ ...b, otpId: ref })
      attempts.push({ ...b, otp_id: ref })
      attempts.push({ ...b, sessionId: ref })
      attempts.push({ ...b, id: ref })
      attempts.push({ ...b, requestId: ref })
    }
  }

  let lastErr = null
  for (const body of attempts) {
    try {
      return await boostFetch('/api/v1/otp/verify', { method: 'POST', body })
    } catch (error) {
      lastErr = error
      // ลอง body ถัดไปเมื่อ 400/401/404
      if (![400, 401, 403, 404, 422].includes(Number(error.status))) throw error
    }
  }
  throw lastErr || new Error('ยืนยัน OTP กับ BoostSMS ไม่สำเร็จ')
}
