import { Router } from 'express'
import {
  createId,
  enrichProduct,
  getDb,
  getShopByOwner,
  getShopBySlug,
  persist,
} from '../db.js'
import { requireAuth, requireRole } from '../auth.js'
import { slugify } from '../util.js'

const router = Router()

router.get('/', (_req, res) => {
  const shops = getDb().shops.filter((s) => s.status === 'active')
  res.json({ ok: true, shops })
})

router.get('/all', requireRole('admin'), (_req, res) => {
  res.json({ ok: true, shops: getDb().shops })
})

router.get('/pending', requireRole('admin'), (_req, res) => {
  res.json({
    ok: true,
    shops: getDb().shops.filter((s) => s.status === 'pending'),
  })
})

router.get('/mine', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  res.json({ ok: true, shop: shop ?? null })
})

router.post('/register', requireAuth, (req, res) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      message: 'สมัครบัญชีผู้ขายก่อน แล้วค่อยเปิดร้าน',
    })
  }

  const existing = getShopByOwner(req.user.id)
  if (existing) {
    return res.status(409).json({ ok: false, message: 'คุณมีร้านอยู่แล้ว', shop: existing })
  }

  const { name, description, location } = req.body ?? {}
  if (!name?.trim()) {
    return res.status(400).json({ ok: false, message: 'กรอกชื่อร้าน' })
  }

  const db = getDb()
  let slug = slugify(name) || createId('shop')
  if (db.shops.some((s) => s.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`

  const shop = {
    id: createId('shop'),
    ownerId: req.user.id,
    name: name.trim(),
    slug,
    description: description?.trim() || '',
    location: location?.trim() || 'ไทย',
    status: req.user.role === 'admin' ? 'active' : 'pending',
    createdAt: new Date().toISOString(),
  }

  const user = db.users.find((u) => u.id === req.user.id)
  if (user && user.role === 'buyer') user.role = 'seller'

  db.shops.push(shop)
  persist()
  res.status(201).json({ ok: true, shop })
})

router.patch('/mine', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  if (req.body.name) shop.name = String(req.body.name).trim()
  if (req.body.description !== undefined) shop.description = String(req.body.description).trim()
  if (req.body.location) shop.location = String(req.body.location).trim()
  persist()
  res.json({ ok: true, shop })
})

router.patch('/:id/status', requireRole('admin'), (req, res) => {
  const db = getDb()
  const shop = db.shops.find((s) => s.id === req.params.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ไม่พบร้าน' })
  const { status } = req.body ?? {}
  if (!['pending', 'active', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
  }
  shop.status = status
  persist()
  res.json({ ok: true, shop })
})

router.get('/:slug', (req, res) => {
  const shop = getShopBySlug(req.params.slug)
  if (!shop || shop.status !== 'active') {
    return res.status(404).json({ ok: false, message: 'ไม่พบร้านค้า' })
  }
  const products = getDb()
    .products.filter((p) => p.shopId === shop.id && p.status === 'active')
    .map(enrichProduct)
  res.json({ ok: true, shop, products })
})

export default router
