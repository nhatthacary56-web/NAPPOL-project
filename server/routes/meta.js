import { Router } from 'express'
import { createId, getDb, persist, publicUser } from '../db.js'
import { requireRole } from '../auth.js'

const router = Router()

router.get('/stats', requireRole('admin'), (_req, res) => {
  const db = getDb()
  const revenue = db.orders
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((s, o) => s + o.total, 0)
  const platformFee = db.orders.reduce((sum, order) => {
    if (!order.settlements) return sum
    return (
      sum +
      Object.values(order.settlements).reduce((s, item) => s + (item.fee || 0), 0)
    )
  }, 0)
  res.json({
    ok: true,
    stats: {
      products: db.products.length,
      orders: db.orders.length,
      users: db.users.length,
      shops: db.shops.length,
      pendingShops: db.shops.filter((s) => s.status === 'pending').length,
      pendingReturns: (db.returns || []).filter((r) => r.status === 'pending').length,
      openHelpTickets: (db.helpTickets || []).filter((t) => t.status === 'open').length,
      revenue,
      platformFee,
    },
  })
})

router.get('/users', requireRole('admin'), (_req, res) => {
  res.json({ ok: true, users: getDb().users.map(publicUser) })
})

router.patch('/users/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  const user = db.users.find((u) => u.id === req.params.id)
  if (!user) return res.status(404).json({ ok: false, message: 'ไม่พบสมาชิก' })
  const { role, banned } = req.body ?? {}
  if (role && ['buyer', 'seller', 'admin'].includes(role)) user.role = role
  if (banned !== undefined) user.banned = Boolean(banned)
  persist()
  res.json({ ok: true, user: publicUser(user) })
})

router.get('/brand', (_req, res) => {
  res.json({ ok: true, brand: getDb().brand })
})

router.put('/brand', requireRole('admin'), (req, res) => {
  const db = getDb()
  if (!db.brand) db.brand = {}
  const { name, tagline, primaryColor, secondaryColor, accentColor, logoText, logoUrl } =
    req.body ?? {}
  if (name) db.brand.name = String(name).trim()
  if (tagline !== undefined) db.brand.tagline = String(tagline).trim()
  if (primaryColor) db.brand.primaryColor = String(primaryColor).trim()
  if (secondaryColor) db.brand.secondaryColor = String(secondaryColor).trim()
  if (accentColor) db.brand.accentColor = String(accentColor).trim()
  if (logoText) db.brand.logoText = String(logoText).trim()
  if (logoUrl !== undefined) db.brand.logoUrl = String(logoUrl || '').trim()
  persist()
  res.json({ ok: true, brand: db.brand })
})

const BANNER_TONES = [
  'orange',
  'coral',
  'amber',
  'pink',
  'red',
  'blue',
  'green',
  'purple',
  'teal',
  'black',
]

router.get('/categories', (_req, res) => {
  res.json({ ok: true, categories: getDb().categories })
})

router.post('/categories', requireRole('admin'), (req, res) => {
  const db = getDb()
  const { slug, name, icon, color } = req.body ?? {}
  if (!slug?.trim() || !name?.trim()) {
    return res.status(400).json({ ok: false, message: 'กรอก slug และชื่อหมวด' })
  }
  const normalized = slug.trim().toLowerCase().replace(/\s+/g, '-')
  if (db.categories.some((c) => c.slug === normalized)) {
    return res.status(409).json({ ok: false, message: 'slug นี้มีแล้ว' })
  }
  const category = {
    id: createId('cat'),
    slug: normalized,
    name: name.trim(),
    icon: icon?.trim() || '🏷️',
    color: color?.trim() || '#ffeaea',
  }
  db.categories.push(category)
  persist()
  res.status(201).json({ ok: true, category })
})

router.put('/categories/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  const category = db.categories.find((c) => c.id === req.params.id)
  if (!category) return res.status(404).json({ ok: false, message: 'ไม่พบหมวด' })
  const { slug, name, icon, color } = req.body ?? {}
  if (slug) {
    const normalized = String(slug).trim().toLowerCase().replace(/\s+/g, '-')
    if (db.categories.some((c) => c.slug === normalized && c.id !== category.id)) {
      return res.status(409).json({ ok: false, message: 'slug ซ้ำ' })
    }
    category.slug = normalized
  }
  if (name !== undefined) category.name = String(name).trim()
  if (icon !== undefined) category.icon = String(icon).trim()
  if (color !== undefined) category.color = String(color).trim()
  persist()
  res.json({ ok: true, category })
})

router.delete('/categories/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  const idx = db.categories.findIndex((c) => c.id === req.params.id)
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบหมวด' })
  const slug = db.categories[idx].slug
  if (db.products.some((p) => p.categorySlug === slug && p.status !== 'deleted')) {
    return res.status(400).json({
      ok: false,
      message: 'มีสินค้าในหมวดนี้ — ย้ายหมวดสินค้าก่อนลบ',
    })
  }
  db.categories.splice(idx, 1)
  persist()
  res.json({ ok: true })
})

router.get('/banners', (_req, res) => {
  const banners = [...(getDb().banners || [])]
    .filter((b) => b.active !== false)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
  res.json({ ok: true, banners })
})

router.get('/banners/all', requireRole('admin'), (_req, res) => {
  const banners = [...(getDb().banners || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0))
  res.json({ ok: true, banners })
})

router.post('/banners', requireRole('admin'), (req, res) => {
  const db = getDb()
  const { title, subtitle, tone, link, active = true, sort, image } = req.body ?? {}
  if (!title?.trim() && !String(image || '').trim()) {
    return res.status(400).json({ ok: false, message: 'ใส่หัวข้อหรือรูปแบนเนอร์อย่างน้อยอย่างใดอย่างหนึ่ง' })
  }
  const banner = {
    id: createId('bn'),
    title: String(title || '').trim() || 'โปรโมชัน',
    subtitle: String(subtitle || '').trim(),
    image: String(image || '').trim() || null,
    tone: BANNER_TONES.includes(tone) ? tone : 'orange',
    link: String(link || '/mall').trim(),
    active: Boolean(active),
    sort: Number(sort) || (db.banners?.length || 0) + 1,
  }
  if (!db.banners) db.banners = []
  db.banners.push(banner)
  persist()
  res.status(201).json({ ok: true, banner })
})

router.put('/banners/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  const banner = (db.banners || []).find((b) => b.id === req.params.id)
  if (!banner) return res.status(404).json({ ok: false, message: 'ไม่พบแบนเนอร์' })
  for (const key of ['title', 'subtitle', 'tone', 'link', 'active', 'sort', 'image']) {
    if (req.body[key] !== undefined) {
      if (key === 'sort') banner[key] = Number(req.body[key])
      else if (key === 'tone') banner[key] = BANNER_TONES.includes(req.body[key]) ? req.body[key] : banner.tone
      else if (key === 'image') banner[key] = String(req.body[key] || '').trim() || null
      else banner[key] = req.body[key]
    }
  }
  persist()
  res.json({ ok: true, banner })
})

router.delete('/banners/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  if (!db.banners) db.banners = []
  const idx = db.banners.findIndex((b) => b.id === req.params.id)
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบแบนเนอร์' })
  db.banners.splice(idx, 1)
  persist()
  res.json({ ok: true })
})

router.get('/reports/commission', requireRole('admin'), (_req, res) => {
  const db = getDb()
  const rows = []
  for (const order of db.orders) {
    if (!order.settlements) continue
    for (const [shopId, s] of Object.entries(order.settlements)) {
      const shop = db.shops.find((x) => x.id === shopId)
      rows.push({
        orderId: order.id,
        shopId,
        shopName: shop?.name || shopId,
        createdAt: order.createdAt,
        orderStatus: order.status,
        settlementStatus: s.status,
        gross: s.gross,
        fee: s.fee,
        net: s.net,
      })
    }
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.gross
      acc.fee += r.fee
      acc.net += r.net
      return acc
    },
    { gross: 0, fee: 0, net: 0 },
  )
  res.json({ ok: true, rows, totals })
})

router.get('/app-content', (_req, res) => {
  res.json({ ok: true, appContent: getDb().appContent || defaultAppContentSafe() })
})

router.put('/app-content', requireRole('admin'), (req, res) => {
  const db = getDb()
  const body = req.body ?? {}
  db.appContent = deepMergeApp(defaultAppContentSafe(), body)
  persist()
  res.json({ ok: true, appContent: db.appContent })
})

router.get('/storefront-settings', (_req, res) => {
  const s = getDb().settings
  res.json({
    ok: true,
    settings: {
      freeShippingMin: s.freeShippingMin ?? 199,
      shippingFee: s.shippingFee ?? 40,
      promptPayPhone: s.promptPayPhone,
      bankAccount: s.bankAccount,
      commissionRate: s.commissionRate,
      paymentMethods: s.paymentMethods || { cod: true, transfer: true, card: true },
      carriers: Array.isArray(s.carriers) ? s.carriers : [],
      defaultCarrier: s.defaultCarrier || 'Kerry Express',
    },
  })
})

function defaultAppContentSafe() {
  return {
    homeShortcuts: [
      { id: 's1', icon: '🚚', label: 'ส่งฟรี*', link: '/mall', active: true, sort: 1 },
      { id: 's2', icon: '💰', label: 'คืนเงิน 100%', link: '/orders', active: true, sort: 2 },
      { id: 's3', icon: '🏷️', label: 'โค้ดส่วนลด', link: '/vouchers', active: true, sort: 3 },
      { id: 's4', icon: '⭐', label: 'ร้านแนะนำ', link: '/mall', active: true, sort: 4 },
    ],
    home: { recommendedTitle: 'สินค้าแนะนำ', showTagline: true },
    flash: { title: 'FLASH SALE', linkLabel: 'ดูทั้งหมด ›', link: '/mall' },
    bannerCta: 'ดูเลย',
    mall: {
      brandLabel: 'Great Mall',
      title: 'แบรนด์แท้ รับประกันคุณภาพ',
      subtitle: 'เลือกซื้อจากร้านทางการและแบรนด์ดัง',
      gridTitle: 'สินค้าจาก Mall',
      badgeFilter: 'Mall',
      categorySlugs: ['electronics', 'beauty'],
    },
    livePage: {
      title: 'ฟีด',
      subtitle: 'โพสต์รูป เขียนแคปชัน และปักตะกร้าสินค้าได้เลย',
    },
    lives: [],
    search: { placeholder: 'ค้นหาสินค้า แบรนด์ และอื่นๆ', popularTitle: 'สินค้ายอดนิยม' },
    productShippingTemplate: 'ส่งจาก {location} · ส่งฟรีเมื่อครบ ฿{freeShippingMin}',
    auth: {
      loginHint: 'หากเข้าสู่ระบบไม่ได้ ติดต่อศูนย์ความช่วยเหลือ',
      buyerPitch: 'สมัครเพื่อสั่งซื้อและติดตามออเดอร์',
      sellerPitch: 'เปิดร้านขายของบนแพลตฟอร์ม',
    },
    legal: {
      privacy:
        'เราเก็บข้อมูลที่จำเป็นต่อการสั่งซื้อและการให้บริการเท่านั้น และไม่ขายข้อมูลส่วนบุคคลแก่บุคคลภายนอกโดยไม่ได้รับความยินยอม',
      terms:
        'การใช้แอปถือว่ายอมรับเงื่อนไขการให้บริการของแพลตฟอร์ม รวมถึงการสั่งซื้อ การชำระเงิน และการจัดส่งตามที่ระบุในแต่ละคำสั่งซื้อ',
      returnPolicy:
        'ลูกค้าสามารถขอคืนสินค้าได้ตามเงื่อนไขของแต่ละร้านภายในระยะเวลาที่กำหนด โดยส่งคำขอผ่านหน้าคำสั่งซื้อ',
    },
    help: {
      title: 'ศูนย์ความช่วยเหลือ',
      subtitle: 'ติดต่อทีมแอดมิน หรือใช้ช่องทางด้านล่าง',
      formTitle: 'ส่งข้อความถึงแอดมิน',
      formHint: 'ทีมงานจะตอบกลับในแอปและส่งการแจ้งเตือนให้คุณ',
      channelsTitle: 'ช่องทางติดต่ออื่น',
      topics: ['คำสั่งซื้อ', 'การชำระเงิน', 'บัญชีผู้ใช้', 'ร้านค้า / ผู้ขาย', 'อื่นๆ'],
      channels: [
        {
          id: 'c1',
          type: 'line',
          label: 'LINE Official',
          value: '@greatapp',
          link: 'https://line.me/R/ti/p/@greatapp',
          active: true,
          sort: 1,
        },
        {
          id: 'c2',
          type: 'phone',
          label: 'โทรศัพท์',
          value: '02-000-0000',
          link: 'tel:020000000',
          active: true,
          sort: 2,
        },
        {
          id: 'c3',
          type: 'email',
          label: 'อีเมล',
          value: 'support@great.app',
          link: 'mailto:support@great.app',
          active: true,
          sort: 3,
        },
        {
          id: 'c4',
          type: 'facebook',
          label: 'Facebook',
          value: 'Great App',
          link: 'https://facebook.com',
          active: true,
          sort: 4,
        },
      ],
    },
  }
}

function deepMergeApp(base, patch) {
  if (!patch || typeof patch !== 'object') return base
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) out[key] = value
    else if (value && typeof value === 'object' && base[key] && !Array.isArray(base[key])) {
      out[key] = { ...base[key], ...value }
    } else if (value !== undefined) out[key] = value
  }
  return out
}

export default router
