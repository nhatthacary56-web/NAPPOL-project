import { Router } from 'express'
import bcrypt from 'bcryptjs'
import {
  createId,
  findUserByEmail,
  findUserByGoogleId,
  findUserByLineId,
  findUserByPhone,
  getDb,
  getShopByOwner,
  normalizePhone,
  persist,
  flushPersist,
  publicUser,
} from '../db.js'
import { signToken, requireAuth } from '../auth.js'
import { createRateLimiter } from '../rateLimit.js'
import {
  isBoostSmsConfigured,
  sendBoostOtpSms,
  getBoostSmsPublicStatus,
  getBoostSmsConfigError,
} from '../boostSms.js'
import { setMemOtp, consumeMemOtp, clearMemOtp, peekMemOtp } from '../otpMem.js'

const router = Router()

const authLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'พยายามเข้าสู่ระบบบ่อยเกินไป',
})

const otpRequestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'ขอรหัส OTP บ่อยเกินไป',
})

const otpVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'ยืนยัน OTP บ่อยเกินไป',
})

const GENERIC_LOGIN_FAIL = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'

function authProviders() {
  const smsReady = isBoostSmsConfigured()
  const forceDemo = process.env.AUTH_DEMO_OTP === '1'
  // มีคีย์ SMS แล้ว → ส่งจริง (ยกเว้นบังคับโหมดทดลอง AUTH_DEMO_OTP=1)
  // ไม่มีคีย์ → โหมดทดลองจนกว่าจะตั้ง AUTH_DEMO_OTP=0
  const demoOtp = forceDemo || (!smsReady && process.env.AUTH_DEMO_OTP !== '0')
  return {
    googleClientId: String(process.env.GOOGLE_CLIENT_ID || '').trim() || null,
    lineChannelId: String(process.env.LINE_CHANNEL_ID || '').trim() || null,
    lineChannelSecret: String(process.env.LINE_CHANNEL_SECRET || '').trim() || null,
    lineRedirectUri:
      String(process.env.LINE_REDIRECT_URI || '').trim() ||
      (process.env.PUBLIC_APP_URL
        ? `${String(process.env.PUBLIC_APP_URL).replace(/\/$/, '')}/login/line/callback`
        : null),
    demoOtp,
    demoSocial: process.env.AUTH_DEMO_SOCIAL !== '0',
    smsReady,
  }
}

function issueSession(user) {
  return { ok: true, token: signToken(user), user: publicUser(user) }
}

function loginMethodCount(user) {
  let n = 0
  if (user.passwordHash && (user.passwordSet === true || !['google', 'line', 'phone'].includes(user.authProvider))) {
    n += 1
  }
  if (user.googleId) n += 1
  if (user.lineId) n += 1
  if (user.phone) n += 1
  return n
}

function dbUser(req) {
  return getDb().users.find((u) => u.id === req.user.id)
}

function blockedAccountMessage(user) {
  if (user?.deletedAt) return 'บัญชีนี้ถูกลบแล้ว'
  if (user?.banned) return 'บัญชีถูกระงับ'
  return null
}

async function resolveGoogleIdentity(body) {
  const providers = authProviders()
  const { credential, demoEmail, demoName } = body ?? {}
  if (credential) {
    const infoRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
    )
    const info = await infoRes.json()
    if (!infoRes.ok || !info.sub) {
      throw Object.assign(new Error('ยืนยัน Google ไม่สำเร็จ'), { status: 401 })
    }
    if (providers.googleClientId && info.aud !== providers.googleClientId) {
      throw Object.assign(new Error('Google Client ID ไม่ตรงกัน'), { status: 401 })
    }
    return {
      googleId: String(info.sub),
      email: String(info.email || '').toLowerCase(),
      name: String(info.name || info.email || 'Google User'),
    }
  }
  if (providers.demoSocial && !providers.googleClientId) {
    const email = String(demoEmail || 'buyer.google@gmail.com').toLowerCase()
    return {
      googleId: `demo_google_${email}`,
      email,
      name: String(demoName || 'Google Buyer'),
    }
  }
  throw Object.assign(new Error('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID'), { status: 400 })
}

async function resolveLineIdentity(body) {
  const providers = authProviders()
  const { accessToken, code, demoName } = body ?? {}
  let token = accessToken
  let lineId = ''
  let name = ''

  if (!token && code) {
    if (!providers.lineChannelId || !providers.lineChannelSecret || !providers.lineRedirectUri) {
      throw Object.assign(new Error('ยังไม่ได้ตั้งค่า LINE Login ให้ครบ'), { status: 400 })
    }
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      redirect_uri: providers.lineRedirectUri,
      client_id: providers.lineChannelId,
      client_secret: providers.lineChannelSecret,
    })
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw Object.assign(
        new Error(tokenJson.error_description || tokenJson.error || 'แลกโค้ด LINE ไม่สำเร็จ'),
        { status: 401 },
      )
    }
    token = tokenJson.access_token
  }

  if (token) {
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const profile = await verifyRes.json()
    if (!verifyRes.ok || !profile.sub) {
      const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const basic = await profileRes.json()
      if (!profileRes.ok || !basic.userId) {
        throw Object.assign(new Error('ยืนยัน LINE ไม่สำเร็จ'), { status: 401 })
      }
      lineId = String(basic.userId)
      name = String(basic.displayName || 'LINE User')
    } else {
      lineId = String(profile.sub)
      name = String(profile.name || 'LINE User')
    }
    return { lineId, name }
  }

  if (providers.demoSocial && !providers.lineChannelId) {
    return { lineId: `demo_line_${Date.now()}`, name: String(demoName || 'LINE Buyer') }
  }
  throw Object.assign(new Error('LINE ยังไม่พร้อม'), { status: 400 })
}

function ensureBuyerByPhone(phone, name) {
  const db = getDb()
  const normalized = normalizePhone(phone)
  let user = findUserByPhone(normalized)
  if (user) return user
  user = {
    id: createId('u'),
    name: name || `ผู้ใช้ ${normalized.slice(-4)}`,
    email: `phone_${normalized}@users.great.app`,
    phone: normalized,
    passwordHash: bcrypt.hashSync(createId('tmp'), 8),
    role: 'buyer',
    coins: 100,
    authProvider: 'phone',
    createdAt: new Date().toISOString(),
  }
  db.users.unshift(user)
  persist()
  return user
}

function upsertSocialUser({ provider, providerId, email, name, phone }) {
  const db = getDb()
  let user =
    provider === 'google'
      ? findUserByGoogleId(providerId)
      : findUserByLineId(providerId)

  if (!user && email) user = findUserByEmail(email)

  if (!user) {
    user = {
      id: createId('u'),
      name: name || (provider === 'google' ? 'Google User' : 'LINE User'),
      email: email || `${provider}_${providerId}@users.great.app`,
      phone: phone || '',
      passwordHash: bcrypt.hashSync(createId('tmp'), 8),
      role: 'buyer',
      coins: 100,
      authProvider: provider,
      createdAt: new Date().toISOString(),
    }
    db.users.unshift(user)
  }

  if (provider === 'google') user.googleId = providerId
  if (provider === 'line') user.lineId = providerId
  if (name) user.name = name
  if (email && !user.email) user.email = email
  if (phone && !user.phone) user.phone = normalizePhone(phone)
  persist()
  return user
}

router.get('/providers', (_req, res) => {
  const p = authProviders()
  const lineReady = Boolean(p.lineChannelId && p.lineChannelSecret && p.lineRedirectUri)
  res.json({
    ok: true,
    providers: {
      phone: true,
      google: Boolean(p.googleClientId) || p.demoSocial,
      line: lineReady || p.demoSocial,
      email: true,
      googleClientId: p.googleClientId,
      lineChannelId: p.lineChannelId,
      lineRedirectUri: p.lineRedirectUri,
      lineReady,
      demoOtp: p.demoOtp,
      demoSocial: p.demoSocial && !p.googleClientId && !lineReady,
      smsReady: p.smsReady,
    },
  })
})

/** ตรวจสถานะ SMS โดยไม่เปิดเผยคีย์ — ใช้ไล่บั๊ก OTP ไม่มา */
router.get('/sms-status', (_req, res) => {
  const p = authProviders()
  const sms = getBoostSmsPublicStatus()
  const configError = getBoostSmsConfigError()
  res.json({
    ok: true,
    smsReady: p.smsReady && !configError,
    demoOtp: p.demoOtp,
    sender: sms.sender,
    keyLooksOk: sms.keyLooksOk,
    configError,
    hint: configError
      ? configError
      : !p.smsReady
        ? 'ตั้ง BOOST_SMS_API_KEY บน Render แล้ว Redeploy'
        : p.demoOtp
          ? 'ตอนนี้โหมดทดลอง (AUTH_DEMO_OTP=1) — จะไม่ส่ง SMS จริง'
          : 'พร้อมส่ง SMS จริงเมื่อกดขอ OTP',
  })
})

router.post('/register', (req, res) => {
  const { name, email, phone, password, role = 'buyer' } = req.body ?? {}
  if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
    return res.status(400).json({ ok: false, message: 'กรอกข้อมูลให้ครบ' })
  }
  if (password.length < 4) {
    return res.status(400).json({ ok: false, message: 'รหัสผ่านอย่างน้อย 4 ตัวอักษร' })
  }
  const allowed = role === 'seller' ? 'seller' : 'buyer'
  if (findUserByEmail(email)) {
    return res.status(409).json({ ok: false, message: 'อีเมลนี้ถูกใช้แล้ว' })
  }
  const normalized = normalizePhone(phone)
  if (findUserByPhone(normalized)) {
    return res.status(409).json({ ok: false, message: 'เบอร์นี้ถูกใช้แล้ว' })
  }

  const db = getDb()
  const user = {
    id: createId('u'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: normalized,
    passwordHash: bcrypt.hashSync(password, 10),
    passwordSet: true,
    role: allowed,
    coins: allowed === 'buyer' ? 100 : 50,
    authProvider: 'email',
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  persist()

  res.status(201).json(issueSession(user))
})

router.post('/login', authLoginLimiter, (req, res) => {
  const { email, password } = req.body ?? {}
  const user = findUserByEmail(email ?? '')
  if (!user || !user.passwordHash || !bcrypt.compareSync(password ?? '', user.passwordHash)) {
    return res.status(401).json({ ok: false, message: GENERIC_LOGIN_FAIL })
  }
  // Admins must use /auth/admin-login — keep customer login separate
  if (user.role === 'admin') {
    return res.status(401).json({ ok: false, message: GENERIC_LOGIN_FAIL })
  }
  const blocked = blockedAccountMessage(user)
  if (blocked) return res.status(403).json({ ok: false, message: blocked })
  res.json(issueSession(user))
})

router.post('/admin-login', authLoginLimiter, (req, res) => {
  const raw = String(req.body?.email || req.body?.username || '').trim().toLowerCase()
  const password = req.body?.password ?? ''
  // Shorthand "admin" → seeded admin email
  const email = raw === 'admin' ? 'admin@great.app' : raw
  if (!email.includes('@') || !password) {
    return res.status(401).json({ ok: false, message: GENERIC_LOGIN_FAIL })
  }

  const user = findUserByEmail(email)
  if (
    !user ||
    user.role !== 'admin' ||
    !user.passwordHash ||
    !bcrypt.compareSync(password, user.passwordHash)
  ) {
    return res.status(401).json({ ok: false, message: GENERIC_LOGIN_FAIL })
  }
  const blocked = blockedAccountMessage(user)
  if (blocked) return res.status(403).json({ ok: false, message: blocked })
  res.json({ ...issueSession(user), message: 'เข้าสู่ระบบแอดมินสำเร็จ' })
})

router.post('/otp/request', otpRequestLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  if (!phone || phone.length < 9) {
    return res.status(400).json({ ok: false, message: 'กรอกเบอร์โทรให้ถูกต้อง' })
  }
  const providers = authProviders()
  const db = getDb()
  if (!Array.isArray(db.otpCodes)) db.otpCodes = []

  if (!providers.demoOtp && !providers.smsReady) {
    return res.status(503).json({
      ok: false,
      message: 'ยังไม่ได้ตั้งค่า SMS บนเซิร์ฟเวอร์ (BOOST_SMS_API_KEY)',
    })
  }

  const code = providers.demoOtp ? '123456' : String(Math.floor(100000 + Math.random() * 900000))
  const ttlMs = 15 * 60 * 1000
  db.otpCodes = db.otpCodes.filter((o) => o.phone !== phone)
  db.otpCodes.push({
    phone,
    code,
    expiresAt: Date.now() + ttlMs,
    channel: providers.demoOtp ? 'demo' : 'sms',
  })
  setMemOtp(phone, code, { ttlMs, channel: providers.demoOtp ? 'demo' : 'sms' })
  await flushPersist()

  if (!providers.demoOtp) {
    const configError = getBoostSmsConfigError()
    if (configError) {
      db.otpCodes = (db.otpCodes || []).filter((o) => o.phone !== phone)
      clearMemOtp(phone)
      await flushPersist()
      return res.status(400).json({ ok: false, message: configError })
    }
    try {
      const brand =
        String(process.env.SMS_BRAND_NAME || process.env.BRAND_NAME || 'DeeJa').trim() || 'DeeJa'
      await sendBoostOtpSms(phone, code, brand)
      // เก็บรหัสเดิมอีกครั้งหลังส่งสำเร็จ (กันถูก overwrite)
      setMemOtp(phone, code, { ttlMs, channel: 'sms' })
      const entry = (db.otpCodes || []).find((o) => o.phone === phone)
      if (entry) {
        entry.code = code
        entry.channel = 'sms'
        entry.expiresAt = Date.now() + ttlMs
      } else {
        db.otpCodes.push({ phone, code, expiresAt: Date.now() + ttlMs, channel: 'sms' })
      }
      await flushPersist()
    } catch (error) {
      db.otpCodes = (db.otpCodes || []).filter((o) => o.phone !== phone)
      clearMemOtp(phone)
      await flushPersist()
      console.error('[boost-sms] send failed:', error.message || error, error.detail || '')
      const configHint = getBoostSmsConfigError()
      return res.status(502).json({
        ok: false,
        message: configHint
          ? configHint
          : error.status === 401
            ? 'API Key ของ BoostSMS ไม่ถูกต้อง — ตรวจ BOOST_SMS_API_KEY ต้องเป็น Secret Key (sk_live_...)'
            : error.status === 429
              ? 'ขอ OTP บ่อยเกินไปจากผู้ให้บริการ SMS — รอสักครู่แล้วลองใหม่'
              : `ส่ง SMS ไม่สำเร็จ: ${error.message || 'ลองใหม่ภายหลัง'}`,
      })
    }
  }

  res.json({
    ok: true,
    message: providers.demoOtp
      ? 'ส่งรหัสแล้ว (โหมดทดลองใช้ 123456)'
      : `ส่งรหัส OTP ทาง SMS ไปที่ ${phone} แล้ว`,
    demoCode: providers.demoOtp ? code : undefined,
    sms: !providers.demoOtp,
    expiresInSec: Math.floor(ttlMs / 1000),
  })
})

function matchStoredOtp(phone, code) {
  const got = String(code || '').replace(/\D/g, '')
  if (!got) return false
  if (consumeMemOtp(phone, got)) return true
  const db = getDb()
  const entry = (db.otpCodes || []).find((o) => o.phone === phone)
  if (!entry || !entry.code || entry.expiresAt < Date.now()) return false
  if (String(entry.code).replace(/\D/g, '') !== got) return false
  db.otpCodes = (db.otpCodes || []).filter((o) => o.phone !== phone)
  clearMemOtp(phone)
  return true
}

router.post('/otp/verify', otpVerifyLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  const code = String(req.body?.code || '').replace(/\D/g, '')
  if (!phone || !code) {
    return res.status(400).json({ ok: false, message: 'กรอกเบอร์และรหัส OTP' })
  }

  if (!matchStoredOtp(phone, code)) {
    const still = peekMemOtp(phone)
    const dbEntry = (getDb().otpCodes || []).find((o) => o.phone === phone)
    console.error('[otp/verify] mismatch', {
      phone,
      hasMem: Boolean(still),
      hasDb: Boolean(dbEntry),
      memExp: still?.expiresAt || null,
      dbExp: dbEntry?.expiresAt || null,
    })
    return res.status(401).json({ ok: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ — กดขอรหัสใหม่แล้วใช้รหัสจากข้อความล่าสุดเท่านั้น' })
  }

  const user = ensureBuyerByPhone(phone, req.body?.name)
  const blocked = blockedAccountMessage(user)
  if (blocked) return res.status(403).json({ ok: false, message: blocked })
  await flushPersist()
  res.json({ ...issueSession(user), message: 'เข้าสู่ระบบด้วยเบอร์สำเร็จ' })
})

router.post('/oauth/google', async (req, res) => {
  try {
    const { credential, demoEmail, demoName } = req.body ?? {}
    const providers = authProviders()
    let email = ''
    let name = ''
    let googleId = ''

    if (credential) {
      const infoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      )
      const info = await infoRes.json()
      if (!infoRes.ok || !info.sub) {
        return res.status(401).json({ ok: false, message: 'ยืนยัน Google ไม่สำเร็จ' })
      }
      if (providers.googleClientId && info.aud !== providers.googleClientId) {
        return res.status(401).json({ ok: false, message: 'Google Client ID ไม่ตรงกัน' })
      }
      googleId = String(info.sub)
      email = String(info.email || '').toLowerCase()
      name = String(info.name || info.email || 'Google User')
    } else if (providers.demoSocial && !providers.googleClientId) {
      email = String(demoEmail || 'buyer.google@gmail.com').toLowerCase()
      name = String(demoName || 'Google Buyer')
      googleId = `demo_google_${email}`
    } else {
      return res.status(400).json({ ok: false, message: 'ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID' })
    }

    const user = upsertSocialUser({
      provider: 'google',
      providerId: googleId,
      email,
      name,
    })
    const blocked = blockedAccountMessage(user)
    if (blocked) return res.status(403).json({ ok: false, message: blocked })
    res.json({ ...issueSession(user), message: 'เข้าสู่ระบบด้วย Google สำเร็จ' })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'Google login ไม่สำเร็จ',
    })
  }
})

router.post('/oauth/line', async (req, res) => {
  try {
    const { accessToken, code, demoName } = req.body ?? {}
    const providers = authProviders()
    let lineId = ''
    let name = ''
    let token = accessToken

    if (!token && code) {
      if (!providers.lineChannelId || !providers.lineChannelSecret || !providers.lineRedirectUri) {
        return res.status(400).json({ ok: false, message: 'ยังไม่ได้ตั้งค่า LINE Login ให้ครบ' })
      }
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: providers.lineRedirectUri,
        client_id: providers.lineChannelId,
        client_secret: providers.lineChannelSecret,
      })
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      const tokenJson = await tokenRes.json()
      if (!tokenRes.ok || !tokenJson.access_token) {
        return res.status(401).json({
          ok: false,
          message: tokenJson.error_description || tokenJson.error || 'แลกโค้ด LINE ไม่สำเร็จ',
        })
      }
      token = tokenJson.access_token
    }

    if (token) {
      const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const profile = await verifyRes.json()
      if (!verifyRes.ok || !profile.sub) {
        // fallback to profile endpoint used by some LINE setups
        const profileRes = await fetch('https://api.line.me/v2/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const basic = await profileRes.json()
        if (!profileRes.ok || !basic.userId) {
          return res.status(401).json({ ok: false, message: 'ยืนยัน LINE ไม่สำเร็จ' })
        }
        lineId = String(basic.userId)
        name = String(basic.displayName || 'LINE User')
      } else {
        lineId = String(profile.sub)
        name = String(profile.name || 'LINE User')
      }
    } else if (providers.demoSocial && !providers.lineChannelId) {
      lineId = 'demo_line_user'
      name = String(demoName || 'LINE Buyer')
    } else if (providers.lineChannelId && !providers.lineChannelSecret) {
      return res.status(400).json({
        ok: false,
        message: 'ใส่ LINE_CHANNEL_SECRET ใน Render ด้วย แล้ว Deploy ใหม่',
      })
    } else {
      return res.status(400).json({
        ok: false,
        message: 'LINE ยังไม่พร้อม — Deploy โค้ดล่าสุดแล้วลองใหม่',
      })
    }

    const user = upsertSocialUser({
      provider: 'line',
      providerId: lineId,
      name,
      email: `line_${lineId}@users.great.app`,
    })
    const blocked = blockedAccountMessage(user)
    if (blocked) return res.status(403).json({ ok: false, message: blocked })
    res.json({ ...issueSession(user), message: 'เข้าสู่ระบบด้วย LINE สำเร็จ' })
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'LINE login ไม่สำเร็จ',
    })
  }
})

router.get('/me', requireAuth, (req, res) => {
  const shop = req.user.role === 'seller' ? getShopByOwner(req.user.id) : null
  res.json({ ok: true, user: req.user, shop })
})

router.patch('/me', requireAuth, (req, res) => {
  const db = getDb()
  const user = db.users.find((u) => u.id === req.user.id)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
  if (req.body.name) user.name = String(req.body.name).trim()
  if (req.body.phone) user.phone = normalizePhone(req.body.phone)
  persist()
  res.json({ ok: true, user: publicUser(user) })
})

router.post('/link/google', requireAuth, async (req, res) => {
  try {
    const user = dbUser(req)
    if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
    if (user.googleId) {
      return res.status(400).json({ ok: false, message: 'เชื่อม Google ไว้แล้ว' })
    }
    const identity = await resolveGoogleIdentity(req.body)
    const taken = findUserByGoogleId(identity.googleId)
    if (taken && taken.id !== user.id) {
      return res.status(409).json({ ok: false, message: 'Google นี้ถูกใช้กับบัญชีอื่นแล้ว' })
    }
    user.googleId = identity.googleId
    if (identity.name && (!user.name || user.name.startsWith('ผู้ใช้ '))) user.name = identity.name
    persist()
    res.json({ ok: true, user: publicUser(user), message: 'เชื่อม Google สำเร็จ' })
  } catch (error) {
    res.status(error?.status || 500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'เชื่อม Google ไม่สำเร็จ',
    })
  }
})

router.post('/unlink/google', requireAuth, (req, res) => {
  const user = dbUser(req)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
  if (!user.googleId) {
    return res.status(400).json({ ok: false, message: 'ยังไม่ได้เชื่อม Google' })
  }
  if (loginMethodCount(user) <= 1) {
    return res.status(400).json({
      ok: false,
      message: 'ต้องเหลืออย่างน้อย 1 ช่องทางเข้าสู่ระบบ',
    })
  }
  delete user.googleId
  persist()
  res.json({ ok: true, user: publicUser(user), message: 'ยกเลิกเชื่อม Google แล้ว' })
})

router.post('/link/line', requireAuth, async (req, res) => {
  try {
    const user = dbUser(req)
    if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
    if (user.lineId) {
      return res.status(400).json({ ok: false, message: 'เชื่อม LINE ไว้แล้ว' })
    }
    const identity = await resolveLineIdentity(req.body)
    const taken = findUserByLineId(identity.lineId)
    if (taken && taken.id !== user.id) {
      return res.status(409).json({ ok: false, message: 'LINE นี้ถูกใช้กับบัญชีอื่นแล้ว' })
    }
    user.lineId = identity.lineId
    if (identity.name && (!user.name || user.name.startsWith('ผู้ใช้ '))) user.name = identity.name
    persist()
    res.json({ ok: true, user: publicUser(user), message: 'เชื่อม LINE สำเร็จ' })
  } catch (error) {
    res.status(error?.status || 500).json({
      ok: false,
      message: error instanceof Error ? error.message : 'เชื่อม LINE ไม่สำเร็จ',
    })
  }
})

router.post('/unlink/line', requireAuth, (req, res) => {
  const user = dbUser(req)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
  if (!user.lineId) {
    return res.status(400).json({ ok: false, message: 'ยังไม่ได้เชื่อม LINE' })
  }
  if (loginMethodCount(user) <= 1) {
    return res.status(400).json({
      ok: false,
      message: 'ต้องเหลืออย่างน้อย 1 ช่องทางเข้าสู่ระบบ',
    })
  }
  delete user.lineId
  persist()
  res.json({ ok: true, user: publicUser(user), message: 'ยกเลิกเชื่อม LINE แล้ว' })
})

router.post('/link/phone', requireAuth, async (req, res) => {
  const user = dbUser(req)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
  const phone = normalizePhone(req.body?.phone)
  const code = String(req.body?.code || '').replace(/\D/g, '')
  if (!phone || !code) {
    return res.status(400).json({ ok: false, message: 'กรอกเบอร์และรหัส OTP' })
  }
  if (!matchStoredOtp(phone, code)) {
    return res.status(401).json({
      ok: false,
      message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ — กดขอรหัสใหม่แล้วใช้รหัสจากข้อความล่าสุดเท่านั้น',
    })
  }
  const taken = findUserByPhone(phone)
  if (taken && taken.id !== user.id) {
    return res.status(409).json({ ok: false, message: 'เบอร์นี้ถูกใช้กับบัญชีอื่นแล้ว' })
  }
  user.phone = phone
  await flushPersist()
  res.json({ ok: true, user: publicUser(user), message: 'เชื่อมเบอร์โทรสำเร็จ' })
})

router.post('/password', requireAuth, (req, res) => {
  const user = dbUser(req)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
  const { currentPassword, newPassword } = req.body ?? {}
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ ok: false, message: 'รหัสผ่านใหม่ต้องอย่างน้อย 6 ตัวอักษร' })
  }
  const hasRealPassword =
    user.passwordHash && (user.passwordSet === true || !['google', 'line', 'phone'].includes(user.authProvider))
  if (hasRealPassword) {
    if (!currentPassword || !bcrypt.compareSync(String(currentPassword), user.passwordHash)) {
      return res.status(401).json({ ok: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' })
    }
  }
  user.passwordHash = bcrypt.hashSync(String(newPassword), 10)
  user.passwordSet = true
  if (!user.authProvider || ['google', 'line', 'phone'].includes(user.authProvider)) {
    user.authProvider = 'email'
  }
  persist()
  res.json({ ok: true, user: publicUser(user), message: 'ตั้งรหัสผ่านสำเร็จ' })
})

/** Soft-delete สำหรับ Play / PDPA — ลบข้อมูลส่วนตัว แต่เก็บออเดอร์ประวัติไว้แบบไม่ระบุตัวตน */
router.post('/me/delete', requireAuth, (req, res) => {
  const confirm = String(req.body?.confirm || '').trim().toUpperCase()
  if (confirm !== 'DELETE') {
    return res.status(400).json({
      ok: false,
      message: 'พิมพ์ยืนยัน DELETE เพื่อลบบัญชี',
    })
  }
  const db = getDb()
  const user = db.users.find((u) => u.id === req.user.id)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบผู้ใช้' })
  if (user.role === 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่สามารถลบบัญชีแอดมินได้' })
  }
  if (user.deletedAt) {
    return res.json({ ok: true, message: 'บัญชีถูกลบไปแล้ว' })
  }

  const openStatuses = new Set(['unpaid', 'to_ship', 'shipping'])
  const openOrders = (db.orders || []).filter(
    (o) => o.userId === user.id && openStatuses.has(o.status),
  )
  if (openOrders.length > 0) {
    return res.status(400).json({
      ok: false,
      message: `ยังมีออเดอร์ที่กำลังดำเนินการ ${openOrders.length} รายการ — ยกเลิกหรือรอให้เสร็จก่อนลบบัญชี`,
    })
  }
  const openReturns = (db.returns || []).filter(
    (r) =>
      r.userId === user.id &&
      !['approved', 'rejected', 'refunded', 'cancelled', 'closed'].includes(r.status),
  )
  if (openReturns.length > 0) {
    return res.status(400).json({
      ok: false,
      message: `ยังมีคำขอคืนสินค้าค้างอยู่ ${openReturns.length} รายการ — รอให้เสร็จก่อนลบบัญชี`,
    })
  }

  const shop = getShopByOwner(user.id)
  if (shop) {
    shop.active = false
    shop.vacationMode = true
    shop.name = shop.name ? `${shop.name} (ปิดแล้ว)` : 'ร้านที่ปิดแล้ว'
  }

  const stamp = Date.now()
  user.deletedAt = new Date(stamp).toISOString()
  user.banned = true
  user.name = 'บัญชีที่ลบแล้ว'
  user.email = `deleted+${user.id}@invalid.local`
  user.phone = ''
  user.passwordHash = bcrypt.hashSync(`deleted-${user.id}-${stamp}`, 10)
  user.passwordSet = false
  delete user.googleId
  delete user.lineId
  user.authProvider = 'deleted'

  if (db.carts && db.carts[user.id]) delete db.carts[user.id]
  if (Array.isArray(db.addresses)) {
    db.addresses = db.addresses.filter((a) => a.userId !== user.id)
  }
  if (Array.isArray(db.userVouchers)) {
    db.userVouchers = db.userVouchers.filter((c) => c.userId !== user.id)
  }
  if (Array.isArray(db.buyerWallets)) {
    const wallet = db.buyerWallets.find((w) => w.userId === user.id)
    if (wallet) {
      wallet.balance = 0
      wallet.deleted = true
    }
  }

  persist()
  res.json({ ok: true, message: 'ลบบัญชีเรียบร้อยแล้ว' })
})

export default router
