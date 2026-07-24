import { Router } from 'express'
import bcrypt from 'bcryptjs'
import {
  createId,
  findUserByEmail,
  getDb,
  getShopByOwner,
  persist,
  publicUser,
} from '../db.js'
import { signToken, requireAuth } from '../auth.js'

const router = Router()

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

  const db = getDb()
  const user = {
    id: createId('u'),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    role: allowed,
    coins: allowed === 'buyer' ? 100 : 50,
    createdAt: new Date().toISOString(),
  }
  db.users.push(user)
  persist()

  const token = signToken(user)
  res.status(201).json({ ok: true, token, user: publicUser(user) })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body ?? {}
  const user = findUserByEmail(email ?? '')
  if (!user || !bcrypt.compareSync(password ?? '', user.passwordHash)) {
    return res.status(401).json({ ok: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' })
  }
  res.json({ ok: true, token: signToken(user), user: publicUser(user) })
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
  if (req.body.phone) user.phone = String(req.body.phone).trim()
  persist()
  res.json({ ok: true, user: publicUser(user) })
})

export default router
