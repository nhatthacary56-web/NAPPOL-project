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
  publicUser,
} from '../db.js'
import { signToken, requireAuth } from '../auth.js'

const router = Router()

function authProviders() {
  return {
    googleClientId: String(process.env.GOOGLE_CLIENT_ID || '').trim() || null,
    lineChannelId: String(process.env.LINE_CHANNEL_ID || '').trim() || null,
    lineRedirectUri:
      String(process.env.LINE_REDIRECT_URI || '').trim() ||
      (process.env.PUBLIC_APP_URL
        ? `${String(process.env.PUBLIC_APP_URL).replace(/\/$/, '')}/login/line/callback`
        : null),
    demoOtp: process.env.AUTH_DEMO_OTP !== '0',
    demoSocial: process.env.AUTH_DEMO_SOCIAL !== '0',
  }
}

function issueSession(user) {
  return { ok: true, token: signToken(user), user: publicUser(user) }
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
  res.json({
    ok: true,
    providers: {
      phone: true,
      google: Boolean(p.googleClientId) || p.demoSocial,
      line: Boolean(p.lineChannelId) || p.demoSocial,
      email: true,
      googleClientId: p.googleClientId,
      lineChannelId: p.lineChannelId,
      lineRedirectUri: p.lineRedirectUri,
      demoOtp: p.demoOtp,
      demoSocial: p.demoSocial && !p.googleClientId && !p.lineChannelId,
    },
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
    role: allowed,
    coins: allowed === 'buyer' ? 100 : 50,
    authProvider: 'email',
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  persist()

  res.status(201).json(issueSession(user))
})

router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const user = findUserByEmail(email ?? '')
  if (!user || !user.passwordHash || !bcrypt.compareSync(password ?? '', user.passwordHash)) {
    return res.status(401).json({ ok: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }
  if (user.banned) return res.status(403).json({ ok: false, message: 'บัญชีถูกระงับ' })
  res.json(issueSession(user))
})

router.post('/otp/request', (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  if (!phone || phone.length < 9) {
    return res.status(400).json({ ok: false, message: 'กรอกเบอร์โทรให้ถูกต้อง' })
  }
  const db = getDb()
  if (!Array.isArray(db.otpCodes)) db.otpCodes = []
  const demo = authProviders().demoOtp
  const code = demo ? '123456' : String(Math.floor(100000 + Math.random() * 900000))
  db.otpCodes = db.otpCodes.filter((o) => o.phone !== phone)
  db.otpCodes.push({
    phone,
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  })
  persist()

  // Real SMS gateway can plug in here later.
  res.json({
    ok: true,
    message: demo ? 'ส่งรหัสแล้ว (โหมดทดลองใช้ 123456)' : 'ส่งรหัส OTP แล้ว',
    demoCode: demo ? code : undefined,
    expiresInSec: 300,
  })
})

router.post('/otp/verify', (req, res) => {
  const phone = normalizePhone(req.body?.phone)
  const code = String(req.body?.code || '').trim()
  if (!phone || !code) {
    return res.status(400).json({ ok: false, message: 'กรอกเบอร์และรหัส OTP' })
  }
  const db = getDb()
  const entry = (db.otpCodes || []).find((o) => o.phone === phone)
  if (!entry || entry.code !== code || entry.expiresAt < Date.now()) {
    return res.status(401).json({ ok: false, message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ' })
  }
  db.otpCodes = (db.otpCodes || []).filter((o) => o.phone !== phone)
  const user = ensureBuyerByPhone(phone, req.body?.name)
  if (user.banned) return res.status(403).json({ ok: false, message: 'บัญชีถูกระงับ' })
  persist()
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
    } else if (providers.demoSocial) {
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
    if (user.banned) return res.status(403).json({ ok: false, message: 'บัญชีถูกระงับ' })
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
    const { accessToken, demoName } = req.body ?? {}
    const providers = authProviders()
    let lineId = ''
    let name = ''

    if (accessToken) {
      const verifyRes = await fetch(
        `https://api.line.me/oauth2/v2.1/userinfo`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const profile = await verifyRes.json()
      if (!verifyRes.ok || !profile.sub) {
        return res.status(401).json({ ok: false, message: 'ยืนยัน LINE ไม่สำเร็จ' })
      }
      lineId = String(profile.sub)
      name = String(profile.name || 'LINE User')
    } else if (providers.demoSocial) {
      lineId = 'demo_line_user'
      name = String(demoName || 'LINE Buyer')
    } else {
      return res.status(400).json({ ok: false, message: 'ยังไม่ได้ตั้งค่า LINE Login' })
    }

    const user = upsertSocialUser({
      provider: 'line',
      providerId: lineId,
      name,
      email: `line_${lineId}@users.great.app`,
    })
    if (user.banned) return res.status(403).json({ ok: false, message: 'บัญชีถูกระงับ' })
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

export default router
