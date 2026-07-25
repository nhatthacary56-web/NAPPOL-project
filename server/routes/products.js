import { Router } from 'express'
import {
  createId,
  enrichProduct,
  getDb,
  getShopById,
  getShopByOwner,
  persist,
} from '../db.js'
import { requireAuth, authOptional } from '../auth.js'

const router = Router()

function normalizeVariants(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((v, i) => ({
      id: v.id || `var_${i + 1}`,
      name: String(v.name || '').trim(),
      sku: String(v.sku || '').trim() || `SKU-${i + 1}`,
      price: v.price != null && v.price !== '' ? Number(v.price) : null,
      stock: Math.max(0, Number(v.stock) || 0),
    }))
    .filter((v) => v.name)
}

router.get('/', authOptional, (req, res) => {
  const db = getDb()
  const { q, category, shopId, shopCategory, flash } = req.query
  let list = db.products.filter((p) => p.status === 'active')

  list = list.filter((p) => {
    const shop = getShopById(p.shopId)
    return shop?.status === 'active'
  })

  if (category) list = list.filter((p) => p.categorySlug === category)
  if (shopId) list = list.filter((p) => p.shopId === shopId)
  if (shopCategory) list = list.filter((p) => p.shopCategoryId === String(shopCategory))
  if (flash === '1') list = list.filter((p) => p.flashSale)
  if (q) {
    const term = String(q).toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        String(p.description || '')
          .toLowerCase()
          .includes(term),
    )
  }

  res.json({ ok: true, products: list.map(enrichProduct) })
})

router.get('/manage/mine', requireAuth, (req, res) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  const db = getDb()
  let list = db.products
  if (req.user.role === 'seller') {
    const shop = getShopByOwner(req.user.id)
    list = shop ? list.filter((p) => p.shopId === shop.id) : []
  }
  res.json({ ok: true, products: list.map(enrichProduct) })
})

router.get('/:id', authOptional, (req, res) => {
  const db = getDb()
  const product = db.products.find((p) => p.id === req.params.id)
  if (!product || product.status === 'deleted') {
    return res.status(404).json({ ok: false, message: 'ไม่พบสินค้า' })
  }
  res.json({ ok: true, product: enrichProduct(product) })
})

router.post('/', requireAuth, (req, res) => {
  const db = getDb()
  let shop = null

  if (req.user.role === 'admin') {
    shop = req.body.shopId
      ? getShopById(req.body.shopId)
      : db.shops.find((s) => s.status === 'active')
  } else if (req.user.role === 'seller') {
    shop = getShopByOwner(req.user.id)
    if (!shop || shop.status !== 'active') {
      return res.status(403).json({ ok: false, message: 'ร้านยังไม่พร้อมลงสินค้า (รออนุมัติ)' })
    }
  } else {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์ลงสินค้า' })
  }

  if (!shop) return res.status(400).json({ ok: false, message: 'ไม่พบร้านค้า' })

  const {
    name,
    price,
    originalPrice,
    image,
    images,
    location,
    categorySlug,
    shopCategoryId,
    description,
    badge,
    flashSale,
    flashEndsAt,
    stock,
    variants,
    status,
  } = req.body ?? {}

  if (!name?.trim() || !price || !categorySlug) {
    return res.status(400).json({
      ok: false,
      message: 'กรอกชื่อ ราคา และหมวดบนแอป (แพลตฟอร์ม)',
    })
  }
  if (String(name).trim().length > 120) {
    return res.status(400).json({ ok: false, message: 'ชื่อสินค้ายาวเกิน 120 ตัวอักษร' })
  }
  const desc = String(description || '').trim()
  if (desc.length > 5000) {
    return res.status(400).json({ ok: false, message: 'รายละเอียดยาวเกิน 5000 ตัวอักษร' })
  }

  const shopCats = Array.isArray(shop.shopCategories) ? shop.shopCategories : []
  let resolvedShopCategoryId = shopCategoryId ? String(shopCategoryId) : null
  if (resolvedShopCategoryId && !shopCats.some((c) => c.id === resolvedShopCategoryId)) {
    return res.status(400).json({ ok: false, message: 'ไม่พบหมวดในร้านที่เลือก' })
  }

  const imageList = Array.isArray(images)
    ? images.map((u) => String(u).trim()).filter(Boolean)
    : image?.trim()
      ? [image.trim()]
      : []
  if (imageList.length === 0) {
    return res.status(400).json({ ok: false, message: 'ต้องมีรูปสินค้าอย่างน้อย 1 รูป' })
  }

  const variantList = normalizeVariants(variants)
  const nextStatus = ['active', 'hidden', 'draft'].includes(status) ? status : 'active'

  const product = {
    id: createId('p'),
    shopId: shop.id,
    name: name.trim(),
    description: desc,
    price: Number(price),
    originalPrice: originalPrice ? Number(originalPrice) : undefined,
    image: imageList[0],
    images: imageList,
    variants: variantList,
    sold: 0,
    stock: variantList.length
      ? variantList.reduce((s, v) => s + v.stock, 0)
      : Math.max(0, Number(stock) || 0),
    rating: 5,
    location: location?.trim() || shop.location || 'ไทย',
    categorySlug,
    shopCategoryId: resolvedShopCategoryId,
    badge: badge?.trim() || undefined,
    flashSale: Boolean(flashSale),
    flashEndsAt: flashEndsAt || null,
    status: nextStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  db.products.unshift(product)
  persist()
  res.status(201).json({ ok: true, product: enrichProduct(product) })
})

router.patch('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const product = db.products.find((p) => p.id === req.params.id)
  if (!product) return res.status(404).json({ ok: false, message: 'ไม่พบสินค้า' })

  if (req.user.role === 'seller') {
    const shop = getShopByOwner(req.user.id)
    if (!shop || product.shopId !== shop.id) {
      return res.status(403).json({ ok: false, message: 'แก้ได้เฉพาะสินค้าของร้านตนเอง' })
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  const fields = [
    'name',
    'description',
    'price',
    'originalPrice',
    'image',
    'location',
    'categorySlug',
    'shopCategoryId',
    'badge',
    'flashSale',
    'flashEndsAt',
    'status',
    'stock',
  ]
  for (const key of fields) {
    if (req.body[key] !== undefined) {
      if (key === 'price' || key === 'originalPrice' || key === 'stock') {
        product[key] =
          req.body[key] === '' || req.body[key] == null
            ? key === 'stock'
              ? 0
              : undefined
            : Number(req.body[key])
      } else if (key === 'flashSale') {
        product[key] = Boolean(req.body[key])
      } else if (key === 'description') {
        const desc = String(req.body[key] || '').trim()
        if (desc.length > 5000) {
          return res.status(400).json({ ok: false, message: 'รายละเอียดยาวเกิน 5000 ตัวอักษร' })
        }
        product.description = desc
      } else if (key === 'name') {
        const n = String(req.body[key] || '').trim()
        if (!n) return res.status(400).json({ ok: false, message: 'กรอกชื่อสินค้า' })
        if (n.length > 120) {
          return res.status(400).json({ ok: false, message: 'ชื่อสินค้ายาวเกิน 120 ตัวอักษร' })
        }
        product.name = n
      } else if (key === 'status') {
        if (!['active', 'hidden', 'draft'].includes(req.body[key])) {
          return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
        }
        product.status = req.body[key]
      } else if (key === 'shopCategoryId') {
        const shop = getShopById(product.shopId)
        const shopCats = Array.isArray(shop?.shopCategories) ? shop.shopCategories : []
        const val = req.body[key] ? String(req.body[key]) : null
        if (val && !shopCats.some((c) => c.id === val)) {
          return res.status(400).json({ ok: false, message: 'ไม่พบหมวดในร้านที่เลือก' })
        }
        product.shopCategoryId = val
      } else {
        product[key] = req.body[key]
      }
    }
  }
  if (Array.isArray(req.body.images)) {
    product.images = req.body.images.map((u) => String(u).trim()).filter(Boolean)
    if (product.images[0]) product.image = product.images[0]
  }
  if (req.body.variants !== undefined) {
    product.variants = normalizeVariants(req.body.variants)
    if (product.variants.length) {
      product.stock = product.variants.reduce((s, v) => s + v.stock, 0)
    }
  }
  product.updatedAt = new Date().toISOString()
  persist()
  res.json({ ok: true, product: enrichProduct(product) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const idx = db.products.findIndex((p) => p.id === req.params.id)
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบสินค้า' })

  const product = db.products[idx]
  if (req.user.role === 'seller') {
    const shop = getShopByOwner(req.user.id)
    if (!shop || product.shopId !== shop.id) {
      return res.status(403).json({ ok: false, message: 'ลบได้เฉพาะสินค้าของร้านตนเอง' })
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  db.products.splice(idx, 1)
  persist()
  res.json({ ok: true })
})

export default router
