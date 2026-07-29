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

const KYC_STRING_FIELDS = [
  'description',
  'location',
  'logoUrl',
  'coverUrl',
  'contactName',
  'contactPhone',
  'contactEmail',
  'idCardNumber',
  'idCardImageUrl',
  'selfieImageUrl',
  'taxId',
  'addressLine',
  'bankName',
  'bankAccountName',
  'bankAccountNumber',
  'bookBankImageUrl',
  'kycNote',
]

function ensureShopCategories(shop) {
  if (!Array.isArray(shop.shopCategories)) shop.shopCategories = []
  return shop.shopCategories
}

/** ข้อมูลที่ลูกค้าเห็นได้ — ไม่โชว์บัตรประชาชน/เลขบัญชีเต็ม */
function toPublicShop(shop) {
  return {
    id: shop.id,
    ownerId: shop.ownerId,
    name: shop.name,
    slug: shop.slug,
    description: shop.description || '',
    location: shop.location || '',
    status: shop.status,
    vacationMode: Boolean(shop.vacationMode),
    shopCategories: ensureShopCategories(shop),
    createdAt: shop.createdAt,
    logoUrl: shop.logoUrl || '',
    coverUrl: shop.coverUrl || '',
    contactPhone: shop.contactPhone || '',
    businessType: shop.businessType || 'individual',
  }
}

function applyShopProfile(shop, body, { allowName = true } = {}) {
  if (allowName && body.name) shop.name = String(body.name).trim()
  for (const key of KYC_STRING_FIELDS) {
    if (body[key] !== undefined) shop[key] = String(body[key] ?? '').trim()
  }
  if (body.businessType === 'company' || body.businessType === 'individual') {
    shop.businessType = body.businessType
  }
  if (body.vacationMode !== undefined) shop.vacationMode = Boolean(body.vacationMode)
  if (!Array.isArray(shop.shopCategories)) shop.shopCategories = []
  if (shop.vacationMode == null) shop.vacationMode = false
}

function validateRegisterBody(body) {
  const name = String(body?.name || '').trim()
  if (!name) return 'กรอกชื่อร้าน'
  if (!String(body?.contactName || '').trim()) return 'กรอกชื่อผู้ติดต่อ'
  if (!String(body?.contactPhone || '').trim()) return 'กรอกเบอร์โทรติดต่อ'
  if (!String(body?.idCardNumber || '').trim()) return 'กรอกเลขบัตรประชาชน'
  if (!String(body?.idCardImageUrl || '').trim()) return 'อัปโหลดรูปบัตรประชาชน'
  if (!String(body?.bankName || '').trim()) return 'เลือกธนาคาร'
  if (!String(body?.bankAccountName || '').trim()) return 'กรอกชื่อบัญชี'
  if (!String(body?.bankAccountNumber || '').trim()) return 'กรอกเลขบัญชี'
  const accountName = String(body.bankAccountName).trim()
  const contactName = String(body.contactName).trim()
  if (accountName.replace(/\s+/g, '') !== contactName.replace(/\s+/g, '')) {
    return 'ชื่อบัญชีต้องตรงกับชื่อผู้ติดต่อ (เจ้าของร้าน)'
  }
  return null
}

function activeShopVouchers(shopId) {
  const now = new Date()
  return getDb()
    .vouchers.filter(
      (v) =>
        v.active &&
        v.scope === 'shop' &&
        v.shopId === shopId &&
        (!v.expiresAt || new Date(v.expiresAt) >= now),
    )
    .map((v) => ({
      ...v,
      shopName: getDb().shops.find((s) => s.id === shopId)?.name || null,
    }))
}

router.get('/', (_req, res) => {
  const shops = getDb()
    .shops.filter((s) => s.status === 'active')
    .map(toPublicShop)
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

router.get('/mine', requireAuth, (req, res) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin' && req.user.role !== 'buyer') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' })
  }
  const shop = getShopByOwner(req.user.id)
  if (shop && !Array.isArray(shop.shopCategories)) shop.shopCategories = []
  res.json({ ok: true, shop: shop ?? null })
})

router.post('/register', requireAuth, (req, res) => {
  // ลูกค้าที่ล็อกอินแล้วเปิดร้านด้วยบัญชีเดิมได้ — อัปเกรด role เป็น seller ด้านล่าง
  if (req.user.role !== 'seller' && req.user.role !== 'admin' && req.user.role !== 'buyer') {
    return res.status(403).json({
      ok: false,
      message: 'กรุณาเข้าสู่ระบบก่อนเปิดร้าน',
    })
  }

  const existing = getShopByOwner(req.user.id)
  if (existing) {
    return res.status(409).json({ ok: false, message: 'คุณมีร้านอยู่แล้ว', shop: existing })
  }

  const body = req.body ?? {}
  const error = validateRegisterBody(body)
  if (error) return res.status(400).json({ ok: false, message: error })

  const db = getDb()
  let slug = slugify(body.name) || createId('shop')
  if (db.shops.some((s) => s.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`

  const shop = {
    id: createId('shop'),
    ownerId: req.user.id,
    name: String(body.name).trim(),
    slug,
    description: '',
    location: 'ไทย',
    status: req.user.role === 'admin' ? 'active' : 'pending',
    vacationMode: false,
    shopCategories: [],
    logoUrl: '',
    coverUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    businessType: 'individual',
    idCardNumber: '',
    idCardImageUrl: '',
    selfieImageUrl: '',
    taxId: '',
    addressLine: '',
    bankName: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bookBankImageUrl: '',
    kycNote: '',
    rejectionReason: '',
    createdAt: new Date().toISOString(),
  }
  applyShopProfile(shop, body, { allowName: true })

  const user = db.users.find((u) => u.id === req.user.id)
  if (user && user.role === 'buyer') user.role = 'seller'

  db.shops.push(shop)
  persist()
  res.status(201).json({ ok: true, shop })
})

router.patch('/mine', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(404).json({ ok: false, message: 'ยังไม่มีร้าน' })
  applyShopProfile(shop, req.body ?? {}, { allowName: true })

  // ถ้าเคยถูกปฏิเสธ แล้วส่งเอกสารใหม่ → กลับไปรออนุมัติ
  if (shop.status === 'rejected') {
    const error = validateRegisterBody({
      name: shop.name,
      contactName: shop.contactName,
      contactPhone: shop.contactPhone,
      idCardNumber: shop.idCardNumber,
      idCardImageUrl: shop.idCardImageUrl,
      bankName: shop.bankName,
      bankAccountName: shop.bankAccountName,
      bankAccountNumber: shop.bankAccountNumber,
    })
    if (error) return res.status(400).json({ ok: false, message: error })
    shop.status = 'pending'
    shop.rejectionReason = ''
  }

  persist()
  res.json({ ok: true, shop })
})

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
  const { status, rejectionReason } = req.body ?? {}
  if (!['pending', 'active', 'rejected', 'suspended'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
  }
  if (status === 'active') {
    if (!shop.idCardImageUrl || !shop.bankAccountNumber) {
      return res.status(400).json({
        ok: false,
        message: 'ร้านยังไม่มีบัตรประชาชนหรือบัญชีธนาคารครบ — ขอให้ร้านอัปเดตก่อนอนุมัติ',
      })
    }
    shop.rejectionReason = ''
  }
  if (status === 'rejected') {
    shop.rejectionReason = String(rejectionReason || '').trim() || 'เอกสารไม่ครบหรือไม่ถูกต้อง'
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
    shop: toPublicShop(shop),
    shopCategories: shop.shopCategories,
    products: products.map(enrichProduct),
    vouchers: activeShopVouchers(shop.id),
  })
})

export default router
