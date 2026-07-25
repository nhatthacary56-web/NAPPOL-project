import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { uid } from './util.js'
import { fetchAppState, isSupabaseConfigured, saveAppState } from './supabase.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const dbPath = path.join(dataDir, 'db.json')

const seedCategories = [
  { id: '1', slug: 'fashion', name: 'แฟชั่น', icon: '👗', color: '#ffe8e2' },
  { id: '2', slug: 'beauty', name: 'ความงาม', icon: '💄', color: '#ffe0ef' },
  { id: '3', slug: 'electronics', name: 'อิเล็กทรอนิกส์', icon: '📱', color: '#e8f3ff' },
  { id: '4', slug: 'home', name: 'บ้านและไลฟ์สไตล์', icon: '🏠', color: '#e9f8ef' },
  { id: '5', slug: 'food', name: 'อาหารและเครื่องดื่ม', icon: '🍜', color: '#fff4e0' },
  { id: '6', slug: 'mom', name: 'แม่และเด็ก', icon: '🍼', color: '#efe8ff' },
  { id: '7', slug: 'sports', name: 'กีฬา', icon: '⚽', color: '#e8fff8' },
  { id: '8', slug: 'pets', name: 'สัตว์เลี้ยง', icon: '🐶', color: '#fff0e8' },
  { id: '9', slug: 'books', name: 'หนังสือ', icon: '📚', color: '#eef2ff' },
  { id: '10', slug: 'vouchers', name: 'คูปอง', icon: '🎟️', color: '#ffeaea' },
]

const seedProductDefs = [
  {
    id: 'p1',
    name: 'เสื้อยืดคอกลมผ้าคอตตอนนุ่ม',
    price: 89,
    originalPrice: 199,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    sold: 12500,
    rating: 4.8,
    location: 'กรุงเทพฯ',
    categorySlug: 'fashion',
    badge: 'ถูกสุด',
    flashSale: true,
  },
  {
    id: 'p2',
    name: 'หูฟังบลูทูธไร้สาย กันน้ำ IPX5',
    price: 299,
    originalPrice: 790,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    sold: 8420,
    rating: 4.7,
    location: 'สมุทรปราการ',
    categorySlug: 'electronics',
    badge: 'ขายดี',
    flashSale: true,
  },
  {
    id: 'p3',
    name: 'ครีมกันแดด SPF50+ เนื้อบางเบา',
    price: 159,
    originalPrice: 320,
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
    sold: 22100,
    rating: 4.9,
    location: 'เชียงใหม่',
    categorySlug: 'beauty',
    flashSale: true,
  },
  {
    id: 'p4',
    name: 'กระเป๋าผ้าแคนวาส Everyday Tote',
    price: 129,
    originalPrice: 250,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&h=400&fit=crop',
    sold: 3100,
    rating: 4.6,
    location: 'นนทบุรี',
    categorySlug: 'fashion',
  },
  {
    id: 'p5',
    name: 'หม้อไฟฟ้าอเนกประสงค์ 2 ลิตร',
    price: 499,
    originalPrice: 990,
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=400&fit=crop',
    sold: 1890,
    rating: 4.5,
    location: 'ชลบุรี',
    categorySlug: 'home',
    badge: 'Mall',
  },
  {
    id: 'p6',
    name: 'รองเท้าผ้าใบสีขาว เบาสบาย',
    price: 349,
    originalPrice: 690,
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
    sold: 9700,
    rating: 4.8,
    location: 'กรุงเทพฯ',
    categorySlug: 'fashion',
    flashSale: true,
  },
  {
    id: 'p7',
    name: 'ขนมขบเคี้ยวเซ็ตรวม 12 ซอง',
    price: 99,
    originalPrice: 180,
    image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop',
    sold: 15600,
    rating: 4.7,
    location: 'ปทุมธานี',
    categorySlug: 'food',
  },
  {
    id: 'p8',
    name: 'โคมไฟตั้งโต๊ะ LED ปรับแสงได้',
    price: 219,
    originalPrice: 450,
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
    sold: 4200,
    rating: 4.6,
    location: 'ขอนแก่น',
    categorySlug: 'home',
  },
]

function emptyDb() {
  return {
    users: [],
    shops: [],
    products: [],
    orders: [],
    addresses: [],
    vouchers: [],
    userVouchers: [],
    wishlists: [],
    reviews: [],
    notifications: [],
    chats: [],
    wallets: [],
    withdrawals: [],
    returns: [],
    categories: seedCategories,
    banners: [
      {
        id: 'b1',
        title: 'ลดแรงทุกวัน',
        subtitle: 'โค้ดส่วนลดสูงสุด ฿100',
        image:
          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=480&fit=crop',
        tone: 'orange',
        link: '/mall',
        active: true,
        sort: 1,
      },
      {
        id: 'b2',
        title: 'Flash Sale',
        subtitle: 'หมดเวลาในอีกไม่กี่ชั่วโมง',
        image:
          'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=480&fit=crop',
        tone: 'coral',
        link: '/mall',
        active: true,
        sort: 2,
      },
      {
        id: 'b3',
        title: 'ส่งฟรีทั่วไทย',
        subtitle: 'เมื่อช้อปครบเงื่อนไข',
        image:
          'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=480&fit=crop',
        tone: 'amber',
        link: '/',
        active: true,
        sort: 3,
      },
    ],
    brand: {
      name: 'Great App',
      tagline: 'ช้อปง่าย ได้ของดี',
      primaryColor: '#ee4d2d',
      secondaryColor: '#ff7337',
      accentColor: '#ffb000',
      logoText: 'Great App',
    },
    settings: {
      commissionRate: 0.05,
      promptPayPhone: '0812345678',
      bankAccount: {
        bank: 'กสิกรไทย',
        accountName: 'Great App Co., Ltd.',
        accountNumber: '123-4-56789-0',
      },
      freeShippingMin: 199,
      shippingFee: 40,
    },
    appContent: defaultAppContent(),
    feedPosts: [],
    helpTickets: [],
    meta: { seeded: false },
  }
}

function defaultAppContent() {
  return {
    homeShortcuts: [
      { id: 's1', icon: '🚚', label: 'ส่งฟรี*', link: '/mall', active: true, sort: 1 },
      { id: 's2', icon: '💰', label: 'คืนเงิน 100%', link: '/orders', active: true, sort: 2 },
      { id: 's3', icon: '🏷️', label: 'โค้ดส่วนลด', link: '/vouchers', active: true, sort: 3 },
      { id: 's4', icon: '⭐', label: 'ร้านแนะนำ', link: '/mall', active: true, sort: 4 },
    ],
    home: {
      recommendedTitle: 'สินค้าแนะนำ',
      showTagline: true,
    },
    flash: {
      title: 'FLASH SALE',
      linkLabel: 'ดูทั้งหมด ›',
      link: '/mall',
    },
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
    search: {
      placeholder: 'ค้นหาสินค้า แบรนด์ และอื่นๆ',
      popularTitle: 'สินค้ายอดนิยม',
    },
    productShippingTemplate: 'ส่งจาก {location} · ส่งฟรีเมื่อครบ ฿{freeShippingMin}',
    auth: {
      loginHint: 'ทดลอง: buyer@great.app / buyer123 · seller@great.app / seller123',
      buyerPitch: 'สมัครเพื่อสั่งซื้อและติดตามออเดอร์',
      sellerPitch: 'เปิดร้านขายของบนแพลตฟอร์ม',
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

/** @type {ReturnType<typeof emptyDb>} */
let db = emptyDb()
let ready = false
let persistTimer = null
let supabaseWarned = false

function saveLocal() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8')
}

function save() {
  saveLocal()
  if (!isSupabaseConfigured()) return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void saveAppState(db)
      .then(() => {
        supabaseWarned = false
      })
      .catch((err) => {
        console.error('[supabase] save failed:', err.message || err)
        supabaseWarned = true
      })
  }, 400)
}

function loadFromObject(raw) {
  db = migrate({ ...emptyDb(), ...raw })
  if (!db.meta?.seeded) {
    seed()
  }
}

function loadLocalFile() {
  if (!fs.existsSync(dbPath)) {
    db = emptyDb()
    seed()
    saveLocal()
    return
  }
  loadFromObject(JSON.parse(fs.readFileSync(dbPath, 'utf8')))
  saveLocal()
}

export async function initDb() {
  if (ready) return db
  if (isSupabaseConfigured()) {
    try {
      const remote = await fetchAppState()
      if (remote && typeof remote === 'object' && (remote.users || remote.meta)) {
        loadFromObject(remote)
        saveLocal()
        console.log('[supabase] loaded app_state from Supabase')
      } else {
        loadLocalFile()
        console.log('[supabase] no remote snapshot yet — seeding')
      }
      syncAdminPasswordFromEnv()
      await saveAppState(db)
      console.log('[supabase] persist ok')
      ready = true
      return db
    } catch (err) {
      console.error('[supabase] init failed:', err.message || err)
      if (err.code === 'NO_TABLE') {
        console.error(
          '[supabase] Open Dashboard → SQL Editor and run supabase/schema.sql then restart',
        )
      }
      console.error('[supabase] falling back to local db.json')
    }
  }
  loadLocalFile()
  syncAdminPasswordFromEnv()
  ready = true
  return db
}

function adminPasswordPlain() {
  const fromEnv = String(process.env.ADMIN_PASSWORD || '').trim()
  return fromEnv || 'greatadmin'
}

/** Apply ADMIN_PASSWORD from env to the seeded admin account on boot. */
export function syncAdminPasswordFromEnv() {
  const fromEnv = String(process.env.ADMIN_PASSWORD || '').trim()
  if (!fromEnv || !db?.users) return false
  const admin = db.users.find((u) => u.role === 'admin' && u.email === 'admin@great.app')
  if (!admin) return false
  if (admin.passwordHash && bcrypt.compareSync(fromEnv, admin.passwordHash)) return false
  admin.passwordHash = bcrypt.hashSync(fromEnv, 10)
  persist()
  console.log('[auth] admin password synced from ADMIN_PASSWORD')
  return true
}

function seed() {
  const adminPass = bcrypt.hashSync(adminPasswordPlain(), 10)
  const sellerPass = bcrypt.hashSync('seller123', 10)
  const buyerPass = bcrypt.hashSync('buyer123', 10)

  const adminId = 'u_admin'
  const sellerId = 'u_seller'
  const buyerId = 'u_buyer'
  const shopId = 'shop_demo'

  db.users = [
    {
      id: adminId,
      name: 'Admin',
      email: 'admin@great.app',
      phone: '0800000000',
      passwordHash: adminPass,
      role: 'admin',
      coins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: sellerId,
      name: 'ร้านตัวอย่าง Great',
      email: 'seller@great.app',
      phone: '0811111111',
      passwordHash: sellerPass,
      role: 'seller',
      coins: 50,
      createdAt: new Date().toISOString(),
    },
    {
      id: buyerId,
      name: 'ลูกค้าทดลอง',
      email: 'buyer@great.app',
      phone: '0822222222',
      passwordHash: buyerPass,
      role: 'buyer',
      coins: 100,
      createdAt: new Date().toISOString(),
    },
  ]

  db.shops = [
    {
      id: shopId,
      ownerId: sellerId,
      name: 'Great Official Shop',
      slug: 'great-official',
      description: 'ร้านตัวอย่างสำหรับทดลองระบบ (ยังไม่เปิดขายจริง)',
      location: 'กรุงเทพฯ',
      status: 'active',
      shopCategories: [
        { id: 'sc_demo_1', name: 'สินค้าแนะนำ', sortOrder: 0 },
        { id: 'sc_demo_2', name: 'เสื้อผ้า', sortOrder: 1 },
      ],
      createdAt: new Date().toISOString(),
    },
  ]

  db.products = seedProductDefs.map((p, index) => ({
    ...p,
    shopId,
    description: p.description || '',
    shopCategoryId: index % 2 === 0 ? 'sc_demo_1' : 'sc_demo_2',
    stock: 50 + index * 10,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  db.vouchers = [
    {
      code: 'GREAT50',
      title: 'ลด ฿50',
      description: 'เมื่อช้อปครบ ฿299',
      discount: 50,
      minSpend: 299,
      expiresAt: '2026-12-31',
      active: true,
    },
    {
      code: 'FREESHIP',
      title: 'ส่งฟรี',
      description: 'ลดค่าส่ง ฿40 เมื่อครบ ฿199',
      discount: 40,
      minSpend: 199,
      expiresAt: '2026-12-31',
      active: true,
    },
    {
      code: 'NEW100',
      title: 'สมาชิกใหม่ลด ฿100',
      description: 'เมื่อช้อปครบ ฿500',
      discount: 100,
      minSpend: 500,
      expiresAt: '2026-09-30',
      active: true,
    },
  ]

  db.addresses = [
    {
      id: 'addr_demo',
      userId: buyerId,
      name: 'ลูกค้าทดลอง',
      phone: '0822222222',
      line1: '123 ถนนตัวอย่าง',
      district: 'วัฒนา',
      province: 'กรุงเทพมหานคร',
      postalCode: '10110',
      isDefault: true,
    },
  ]

  db.wishlists = []
  db.orders = []
  db.reviews = []
  db.chats = []
  db.withdrawals = []
  db.wallets = [
    {
      shopId,
      balance: 0,
      pending: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
    },
  ]
  db.notifications = [
    {
      id: 'n_welcome',
      userId: buyerId,
      type: 'system',
      title: 'ยินดีต้อนรับสู่ Great App',
      body: 'ทดลองสั่งซื้อสินค้าตัวอย่างได้เลย',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ]
  db.settings = {
    commissionRate: 0.05,
    promptPayPhone: '0812345678',
    bankAccount: {
      bank: 'กสิกรไทย',
      accountName: 'Great App Co., Ltd.',
      accountNumber: '123-4-56789-0',
    },
    freeShippingMin: 199,
    shippingFee: 40,
  }
  db.appContent = defaultAppContent()
  db.categories = seedCategories
  db.brand = {
    name: 'Great App',
    tagline: 'ช้อปง่าย ได้ของดี',
    primaryColor: '#ee4d2d',
    secondaryColor: '#ff7337',
    accentColor: '#ffb000',
    logoText: 'Great App',
  }
  db.feedPosts = [
    {
      id: 'feed_demo_1',
      userId: sellerId,
      userName: 'ร้านตัวอย่าง Great',
      userRole: 'seller',
      image:
        'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&h=800&fit=crop',
      caption: 'คอลเลกชันใหม่ประจำสัปดาห์ ปักตะกร้าไว้ให้ช้อปเลย ✨',
      productIds: ['p1', 'p4'],
      status: 'active',
      likedBy: [buyerId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]
  db.meta = { seeded: true }
}

function deepMerge(base, patch) {
  if (Array.isArray(patch)) return patch
  if (!patch || typeof patch !== 'object') return base
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key]) {
      out[key] = deepMerge(base[key], value)
    } else if (value !== undefined) {
      out[key] = value
    }
  }
  return out
}

function migrate(data) {
  if (!Array.isArray(data.reviews)) data.reviews = []
  if (!Array.isArray(data.notifications)) data.notifications = []
  if (!Array.isArray(data.chats)) data.chats = []
  if (!Array.isArray(data.wallets)) data.wallets = []
  if (!Array.isArray(data.withdrawals)) data.withdrawals = []
  if (!Array.isArray(data.returns)) data.returns = []
  if (!Array.isArray(data.userVouchers)) data.userVouchers = []
  if (!Array.isArray(data.helpTickets)) data.helpTickets = []
  if (!Array.isArray(data.otpCodes)) data.otpCodes = []
  if (!Array.isArray(data.feedPosts)) data.feedPosts = []
  if (data.appContent?.livePage) {
    if (data.appContent.livePage.title === 'Live') {
      data.appContent.livePage.title = 'ฟีด'
    }
    if (String(data.appContent.livePage.subtitle || '').includes('ไลฟ์')) {
      data.appContent.livePage.subtitle =
        'โพสต์รูป เขียนแคปชัน และปักตะกร้าสินค้าได้เลย'
    }
  }
  if (!Array.isArray(data.banners) || data.banners.length === 0) {
    data.banners = emptyDb().banners
  }
  if (!data.settings) {
    data.settings = emptyDb().settings
  } else {
    if (data.settings.freeShippingMin == null) data.settings.freeShippingMin = 199
    if (data.settings.shippingFee == null) data.settings.shippingFee = 40
  }
  if (!data.appContent) {
    data.appContent = defaultAppContent()
  } else {
    data.appContent = deepMerge(defaultAppContent(), data.appContent)
  }
  if (!data.brand) data.brand = emptyDb().brand
  if (!data.brand.secondaryColor) data.brand.secondaryColor = '#ff7337'
  if (!data.brand.accentColor) data.brand.accentColor = '#ffb000'
  if (!data.brand.primaryColor) data.brand.primaryColor = '#ee4d2d'

  // Home promo banners: fill missing images so "ลดแรงทุกวัน" shows as photo banners
  const defaultBannerImages = Object.fromEntries(
    (emptyDb().banners || []).map((b) => [b.id, b.image]).filter(([, img]) => img),
  )
  const fallbackBannerPool = [
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&h=480&fit=crop',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=480&fit=crop',
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=480&fit=crop',
  ]
  let bannerImgIdx = 0
  for (const banner of data.banners ?? []) {
    if (!banner.image) {
      banner.image =
        defaultBannerImages[banner.id] ||
        fallbackBannerPool[bannerImgIdx % fallbackBannerPool.length]
      bannerImgIdx += 1
    }
  }
  for (const product of data.products ?? []) {
    if (typeof product.stock !== 'number') product.stock = 100
    if (!Array.isArray(product.images)) {
      product.images = product.image ? [product.image] : []
    }
    if (!Array.isArray(product.variants)) product.variants = []
    if (product.flashEndsAt === undefined) product.flashEndsAt = null
  }
  for (const shop of data.shops ?? []) {
    if (!data.wallets.some((w) => w.shopId === shop.id)) {
      data.wallets.push({
        shopId: shop.id,
        balance: 0,
        pending: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
      })
    }
  }
  return data
}

export function getDb() {
  return db
}

export function persist() {
  save()
}

export async function flushPersist() {
  saveLocal()
  if (!isSupabaseConfigured()) return { ok: false, message: 'supabase not configured' }
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  try {
    await saveAppState(db)
    return { ok: true }
  } catch (err) {
    return { ok: false, message: err.message || String(err) }
  }
}

export function publicUser(user) {
  if (!user) return null
  const { passwordHash, ...safe } = user
  return safe
}

export function findUserByEmail(email) {
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function findUserByPhone(phone) {
  const normalized = normalizePhone(phone)
  if (!normalized) return null
  return db.users.find((u) => normalizePhone(u.phone) === normalized)
}

export function findUserByGoogleId(googleId) {
  return db.users.find((u) => u.googleId === googleId)
}

export function findUserByLineId(lineId) {
  return db.users.find((u) => u.lineId === lineId)
}

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('66') && digits.length >= 11) return `0${digits.slice(2)}`
  if (digits.length === 9 && digits.startsWith('8')) return `0${digits}`
  return digits
}

export function findUserById(id) {
  return db.users.find((u) => u.id === id)
}

export function getShopById(id) {
  return db.shops.find((s) => s.id === id)
}

export function getShopBySlug(slug) {
  return db.shops.find((s) => s.slug === slug)
}

export function getShopByOwner(ownerId) {
  return db.shops.find((s) => s.ownerId === ownerId)
}

export function enrichProduct(product) {
  const shop = getShopById(product.shopId)
  const productReviews = db.reviews.filter((r) => r.productId === product.id)
  const reviewCount = productReviews.length
  const rating =
    reviewCount > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : product.rating
  return {
    ...product,
    stock: typeof product.stock === 'number' ? product.stock : 0,
    shopName: shop?.name ?? 'ร้านค้า',
    shopSlug: shop?.slug ?? null,
    rating: Math.round(rating * 10) / 10,
    reviewCount,
  }
}

export function pushNotification(userId, { type, title, body, link }) {
  if (!userId) return
  db.notifications.unshift({
    id: uid('n'),
    userId,
    type: type || 'system',
    title,
    body,
    link: link || null,
    read: false,
    createdAt: new Date().toISOString(),
  })
}

export function getWallet(shopId) {
  let wallet = db.wallets.find((w) => w.shopId === shopId)
  if (!wallet) {
    wallet = {
      shopId,
      balance: 0,
      pending: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
    }
    db.wallets.push(wallet)
  }
  return wallet
}

export function creditShopPending(shopId, amount) {
  const wallet = getWallet(shopId)
  wallet.pending += amount
}

export function releaseShopPending(shopId, amount) {
  const wallet = getWallet(shopId)
  const move = Math.min(amount, wallet.pending)
  wallet.pending -= move
  wallet.balance += move
  wallet.totalEarned += move
}

export function reverseShopPending(shopId, amount) {
  const wallet = getWallet(shopId)
  wallet.pending = Math.max(0, wallet.pending - amount)
}

export function createId(prefix) {
  return uid(prefix)
}
