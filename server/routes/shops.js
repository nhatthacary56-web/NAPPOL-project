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
  if (shop && !Array.isArray(shop.shopCategories)) shop.shopCategories = []
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
    vacationMode: false,
    shopCategories: [],
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
  if (req.body.vacationMode !== undefined) shop.vacationMode = Boolean(req.body.vacationMode)
  if (!Array.isArray(shop.shopCategories)) shop.shopCategories = []
  if (shop.vacationMode == null) shop.vacationMode = false
  persist()
  res.json({ ok: true, shop })
})

function ensureShopCategories(shop) {
  if (!Array.isArray(shop.shopCategories)) shop.shopCategories = []
  return shop.shopCategories
}

/** หมวดในร้าน — seller สร้างเอง (ไม่ใช่หมวดหน้าแอป) */
router.get('/mine/categories', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  res.json({ ok: true, categories: ensureShopCategories(shop) })
})

router.post('/mine/categories', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ ok: false, message: 'กรอกชื่อหมวดในร้าน' })
  if (name.length > 40) {
    return res.status(400).json({ ok: false, message: 'ชื่อหมวดยาวเกิน 40 ตัวอักษร' })
  }
  const list = ensureShopCategories(shop)
  if (list.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ ok: false, message: 'มีหมวดชื่อนี้อยู่แล้ว' })
  }
  const category = {
    id: createId('sc'),
    name,
    sortOrder: list.length,
  }
  list.push(category)
  persist()
  res.status(201).json({ ok: true, category, categories: list })
})

router.patch('/mine/categories/:catId', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  const list = ensureShopCategories(shop)
  const category = list.find((c) => c.id === req.params.catId)
  if (!category) return res.status(404).json({ ok: false, message: 'ไม่พบหมวดในร้าน' })
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim()
    if (!name) return res.status(400).json({ ok: false, message: 'กรอกชื่อหมวดในร้าน' })
    if (list.some((c) => c.id !== category.id && c.name.toLowerCase() === name.toLowerCase())) {
      return res.status(409).json({ ok: false, message: 'มีหมวดชื่อนี้อยู่แล้ว' })
    }
    category.name = name
  }
  if (req.body?.sortOrder !== undefined) category.sortOrder = Number(req.body.sortOrder) || 0
  persist()
  res.json({ ok: true, category, categories: list })
})

router.delete('/mine/categories/:catId', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  const list = ensureShopCategories(shop)
  const idx = list.findIndex((c) => c.id === req.params.catId)
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบหมวดในร้าน' })
  const catId = list[idx].id
  const used = getDb().products.some(
    (p) => p.shopId === shop.id && p.shopCategoryId === catId && p.status !== 'deleted',
  )
  if (used) {
    return res.status(400).json({
      ok: false,
      message: 'ยังมีสินค้าอยู่ในหมวดนี้ — ย้ายหรือลบสินค้าก่อน',
    })
  }
  list.splice(idx, 1)
  persist()
  res.json({ ok: true, categories: list })
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

/** แอดมินปิดโหมดพักร้อนของร้าน (บังคับ) */
router.patch('/:id/vacation', requireRole('admin'), (req, res) => {
  const db = getDb()
  const shop = db.shops.find((s) => s.id === req.params.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ไม่พบร้าน' })
  shop.vacationMode = Boolean(req.body?.vacationMode)
  persist()
  res.json({ ok: true, shop })
})

router.get('/:slug', (req, res) => {
  const shop = getShopBySlug(req.params.slug)
  if (!shop || shop.status !== 'active') {
    return res.status(404).json({ ok: false, message: 'ไม่พบร้านค้า' })
  }
  ensureShopCategories(shop)
  if (shop.vacationMode == null) shop.vacationMode = false
  const { shopCategory } = req.query
  let products = shop.vacationMode
    ? []
    : getDb().products.filter((p) => p.shopId === shop.id && p.status === 'active')
  if (shopCategory) {
    products = products.filter((p) => p.shopCategoryId === String(shopCategory))
  }
  res.json({
    ok: true,
    shop,
    shopCategories: shop.shopCategories,
    products: products.map(enrichProduct),
  })
})

export default router
