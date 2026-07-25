import { Router } from 'express'
import { getDb, getShopByOwner, persist } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const router = Router()

function withShopName(voucher) {
  if (voucher.scope !== 'shop' || !voucher.shopId) {
    return { ...voucher, shopName: null }
  }
  const shop = getDb().shops.find((s) => s.id === voucher.shopId)
  return { ...voucher, shopName: shop?.name || null }
}

function isUsable(voucher) {
  if (!voucher?.active) return false
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) return false
  return true
}

router.get('/', (req, res) => {
  const { shopId } = req.query
  let vouchers = getDb().vouchers.filter((v) => v.active)
  if (shopId) {
    vouchers = vouchers.filter(
      (v) =>
        (v.scope === 'shop' && v.shopId === String(shopId)) ||
        (!v.scope || v.scope === 'platform'),
    )
    // สำหรับหน้าร้าน: แสดงเฉพาะคูปองร้านนั้น
    if (req.query.shopOnly === '1') {
      vouchers = vouchers.filter((v) => v.scope === 'shop' && v.shopId === String(shopId))
    }
  } else {
    // รายการสาธารณะทั่วไป — คูปองแพลตฟอร์ม (ไม่โชว์คูปองร้านทั้งหมด)
    vouchers = vouchers.filter((v) => !v.scope || v.scope === 'platform')
  }
  vouchers = vouchers.filter(isUsable).map(withShopName)
  res.json({ ok: true, vouchers })
})

router.get('/admin', requireRole('admin'), (_req, res) => {
  const vouchers = getDb().vouchers.map(withShopName)
  res.json({ ok: true, vouchers })
})

router.get('/shop/mine', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  const vouchers = getDb()
    .vouchers.filter((v) => v.scope === 'shop' && v.shopId === shop.id)
    .map(withShopName)
  res.json({ ok: true, vouchers, shopId: shop.id })
})

router.post('/shop', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  if (shop.status !== 'active') {
    return res.status(400).json({ ok: false, message: 'ร้านต้องได้รับการอนุมัติก่อนสร้างคูปอง' })
  }

  const { code, title, description, discount, minSpend, expiresAt, active = true } = req.body ?? {}
  if (!code?.trim() || !title?.trim() || !discount) {
    return res.status(400).json({ ok: false, message: 'กรอกข้อมูลคูปองให้ครบ' })
  }
  const discountNum = Number(discount)
  const minSpendNum = Number(minSpend) || 0
  if (!(discountNum > 0)) {
    return res.status(400).json({ ok: false, message: 'ส่วนลดต้องมากกว่า 0' })
  }
  if (minSpendNum > 0 && discountNum >= minSpendNum) {
    return res.status(400).json({
      ok: false,
      message: 'ส่วนลดต้องน้อยกว่ายอดขั้นต่ำ',
    })
  }

  const db = getDb()
  const normalized = code.trim().toUpperCase()
  if (db.vouchers.some((v) => v.code === normalized)) {
    return res.status(409).json({ ok: false, message: 'โค้ดนี้มีแล้ว' })
  }

  const voucher = {
    code: normalized,
    title: title.trim(),
    description: description?.trim() || `เมื่อซื้อในร้านครบ ฿${minSpendNum || 0}`,
    discount: discountNum,
    minSpend: minSpendNum,
    expiresAt: expiresAt || '2026-12-31',
    active: Boolean(active),
    scope: 'shop',
    shopId: shop.id,
  }
  db.vouchers.unshift(voucher)
  persist()
  res.status(201).json({ ok: true, voucher: withShopName(voucher) })
})

router.put('/shop/:code', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  const db = getDb()
  const voucher = db.vouchers.find((v) => v.code === req.params.code.toUpperCase())
  if (!voucher || voucher.scope !== 'shop' || voucher.shopId !== shop.id) {
    return res.status(404).json({ ok: false, message: 'ไม่พบคูปองของร้าน' })
  }
  for (const key of ['title', 'description', 'discount', 'minSpend', 'expiresAt', 'active']) {
    if (req.body[key] !== undefined) {
      voucher[key] =
        key === 'discount' || key === 'minSpend' ? Number(req.body[key]) : req.body[key]
    }
  }
  persist()
  res.json({ ok: true, voucher: withShopName(voucher) })
})

router.delete('/shop/:code', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  const db = getDb()
  const idx = db.vouchers.findIndex(
    (v) =>
      v.code === req.params.code.toUpperCase() && v.scope === 'shop' && v.shopId === shop.id,
  )
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบคูปองของร้าน' })
  db.vouchers.splice(idx, 1)
  persist()
  res.json({ ok: true })
})

router.post('/claim', requireAuth, (req, res) => {
  const db = getDb()
  const code = String(req.body?.code || '')
    .trim()
    .toUpperCase()
  if (!code) return res.status(400).json({ ok: false, message: 'ใส่โค้ดคูปอง' })
  const voucher = db.vouchers.find((v) => v.code === code && v.active)
  if (!voucher || !isUsable(voucher)) {
    return res.status(404).json({ ok: false, message: 'ไม่พบคูปองหรือหมดอายุ' })
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
  res.status(201).json({
    ok: true,
    voucher: { ...withShopName(voucher), claimedAt: new Date().toISOString() },
  })
})

router.get('/mine', requireAuth, (req, res) => {
  const db = getDb()
  const claimed = (db.userVouchers || [])
    .filter((uv) => uv.userId === req.user.id)
    .map((uv) => {
      const voucher = db.vouchers.find((v) => v.code === uv.code)
      if (!voucher || !isUsable(voucher)) return null
      return {
        ...withShopName(voucher),
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
    scope: 'platform',
    shopId: null,
  }
  db.vouchers.unshift(voucher)
  persist()
  res.status(201).json({ ok: true, voucher: withShopName(voucher) })
})

router.put('/:code', requireRole('admin'), (req, res) => {
  const db = getDb()
  const voucher = db.vouchers.find((v) => v.code === req.params.code.toUpperCase())
  if (!voucher) return res.status(404).json({ ok: false, message: 'ไม่พบคูปอง' })
  if (voucher.scope === 'shop') {
    return res.status(400).json({
      ok: false,
      message: 'คูปองร้านแก้ได้จากหน้า Seller Center หรือลบแล้วให้ร้านสร้างใหม่',
    })
  }
  for (const key of ['title', 'description', 'discount', 'minSpend', 'expiresAt', 'active']) {
    if (req.body[key] !== undefined) {
      voucher[key] =
        key === 'discount' || key === 'minSpend' ? Number(req.body[key]) : req.body[key]
    }
  }
  voucher.scope = 'platform'
  voucher.shopId = null
  persist()
  res.json({ ok: true, voucher: withShopName(voucher) })
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
