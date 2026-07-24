import { Router } from 'express'
import { getDb, persist } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const router = Router()

router.get('/', (_req, res) => {
  const vouchers = getDb().vouchers.filter((v) => v.active)
  res.json({ ok: true, vouchers })
})

router.post('/claim', requireAuth, (req, res) => {
  const db = getDb()
  const code = String(req.body?.code || '')
    .trim()
    .toUpperCase()
  if (!code) return res.status(400).json({ ok: false, message: 'ใส่โค้ดคูปอง' })
  const voucher = db.vouchers.find((v) => v.code === code && v.active)
  if (!voucher) return res.status(404).json({ ok: false, message: 'ไม่พบคูปองหรือหมดอายุ' })
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    return res.status(400).json({ ok: false, message: 'คูปองหมดอายุแล้ว' })
  }
  if (!db.userVouchers) db.userVouchers = []
  if (db.userVouchers.some((uv) => uv.userId === req.user.id && uv.code === code)) {
    return res.status(400).json({ ok: false, message: 'คุณเก็บคูปองนี้แล้ว' })
  }
  db.userVouchers.push({
    userId: req.user.id,
    code,
    claimedAt: new Date().toISOString(),
    usedAt: null,
  })
  persist()
  res.status(201).json({ ok: true, voucher: { ...voucher, claimedAt: new Date().toISOString() } })
})

router.get('/mine', requireAuth, (req, res) => {
  const db = getDb()
  const claimed = (db.userVouchers || [])
    .filter((uv) => uv.userId === req.user.id)
    .map((uv) => {
      const voucher = db.vouchers.find((v) => v.code === uv.code)
      if (!voucher || !voucher.active) return null
      if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return null
      return {
        ...voucher,
        claimedAt: uv.claimedAt,
        usedAt: uv.usedAt || null,
        used: Boolean(uv.usedAt),
      }
    })
    .filter(Boolean)
  res.json({ ok: true, vouchers: claimed })
})

router.post('/', requireRole('admin'), (req, res) => {
  const { code, title, description, discount, minSpend, expiresAt, active = true } = req.body ?? {}
  if (!code?.trim() || !title?.trim() || !discount) {
    return res.status(400).json({ ok: false, message: 'กรอกข้อมูลคูปองให้ครบ' })
  }
  const db = getDb()
  const normalized = code.trim().toUpperCase()
  if (db.vouchers.some((v) => v.code === normalized)) {
    return res.status(409).json({ ok: false, message: 'โค้ดนี้มีแล้ว' })
  }
  const voucher = {
    code: normalized,
    title: title.trim(),
    description: description?.trim() || '',
    discount: Number(discount),
    minSpend: Number(minSpend) || 0,
    expiresAt: expiresAt || '2026-12-31',
    active: Boolean(active),
  }
  db.vouchers.unshift(voucher)
  persist()
  res.status(201).json({ ok: true, voucher })
})

router.put('/:code', requireRole('admin'), (req, res) => {
  const db = getDb()
  const voucher = db.vouchers.find((v) => v.code === req.params.code.toUpperCase())
  if (!voucher) return res.status(404).json({ ok: false, message: 'ไม่พบคูปอง' })
  for (const key of ['title', 'description', 'discount', 'minSpend', 'expiresAt', 'active']) {
    if (req.body[key] !== undefined) {
      voucher[key] =
        key === 'discount' || key === 'minSpend' ? Number(req.body[key]) : req.body[key]
    }
  }
  persist()
  res.json({ ok: true, voucher })
})

router.delete('/:code', requireRole('admin'), (req, res) => {
  const db = getDb()
  const idx = db.vouchers.findIndex((v) => v.code === req.params.code.toUpperCase())
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบคูปอง' })
  db.vouchers.splice(idx, 1)
  persist()
  res.json({ ok: true })
})

export default router
