export type Role = 'buyer' | 'seller' | 'admin'

export type ApiUser = {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  coins: number
  banned?: boolean
  createdAt?: string
  hasPassword?: boolean
  googleLinked?: boolean
  lineLinked?: boolean
  authProvider?: string
}

export type ShopCategory = {
  id: string
  name: string
  sortOrder?: number
}

export type ShopBankAccount = {
  bankName: string
  accountName: string
  accountNumber: string
  bookBankImageUrl?: string
}

export type Shop = {
  id: string
  ownerId: string
  name: string
  slug: string
  description: string
  location: string
  status: 'pending' | 'active' | 'rejected' | 'suspended'
  /** เมื่อเปิด ซ่อนสินค้าจากหน้าร้าน/ค้นหาชั่วคราว */
  vacationMode?: boolean
  shopCategories?: ShopCategory[]
  createdAt: string
  /** โปรไฟล์ร้าน */
  logoUrl?: string
  coverUrl?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  businessType?: 'individual' | 'company'
  /** KYC */
  idCardNumber?: string
  idCardImageUrl?: string
  selfieImageUrl?: string
  taxId?: string
  addressLine?: string
  bankName?: string
  bankAccountName?: string
  bankAccountNumber?: string
  bookBankImageUrl?: string
  kycNote?: string
  rejectionReason?: string
}

export type ApiProduct = {
  id: string
  shopId: string
  shopName?: string
  shopSlug?: string | null
  name: string
  description?: string
  price: number
  originalPrice?: number
  image: string
  images?: string[]
  variants?: Array<{
    id: string
    name: string
    sku: string
    price: number | null
    stock: number
  }>
  sold: number
  stock?: number
  rating: number
  reviewCount?: number
  location: string
  /** หมวดหน้าแอป — แอดมินควบคุม */
  categorySlug: string
  /** หมวดในร้าน — ผู้ขายสร้างเอง */
  shopCategoryId?: string | null
  badge?: string
  flashSale?: boolean
  flashEndsAt?: string | null
  status?: 'active' | 'hidden' | 'draft' | 'deleted' | string
}

export type ApiAddress = {
  id: string
  userId?: string
  name: string
  phone: string
  line1: string
  /** ชั้น / ยูนิต (ถ้ามี) */
  line2?: string
  /** อำเภอ/เขต */
  district: string
  /** ตำบล/แขวง */
  subdistrict?: string
  province: string
  postalCode: string
  addressType?: 'home' | 'office' | 'other'
  isDefault?: boolean
}

export type OrderStatus =
  | 'unpaid'
  | 'to_ship'
  | 'shipping'
  | 'to_review'
  | 'completed'
  | 'cancelled'
  | 'refunded'

/** สถานะย่อยฝั่งจัดส่ง — ไม่แทนที่ status หลัก */
export type OrderFulfillment = {
  labelPrintedAt?: string | null
  packedAt?: string | null
  pickupScheduledAt?: string | null
  pickupSlot?: string | null
  pickupNote?: string | null
  method?: 'pickup' | 'dropoff' | null
}

export type ApiOrder = {
  id: string
  userId: string
  createdAt: string
  status: OrderStatus
  items: Array<{
    productId: string
    shopId: string
    name: string
    image: string
    price: number
    qty: number
    variantId?: string | null
    variantName?: string | null
  }>
  subtotal: number
  shippingFee: number
  discount: number
  total: number
  address: ApiAddress
  paymentMethod: 'cod' | 'transfer' | 'card' | 'wallet'
  voucherCode?: string
  trackingNumber?: string | null
  carrier?: string | null
  shippedAt?: string | null
  returnId?: string | null
  zortOrderId?: number | string | null
  zortOrderNumber?: string | null
  shippingLabelUrl?: string | null
  fulfillment?: OrderFulfillment
  settlements?: Record<
    string,
    { gross: number; fee: number; net: number; status: string }
  >
  payment?: {
    status: 'pending' | 'awaiting_confirm' | 'paid' | 'cod' | 'refunded'
    paidAt?: string | null
    method?: string
    note?: string
    slipImageUrl?: string | null
    bankAccount?: {
      bank: string
      accountName: string
      accountNumber: string
    }
    history?: Array<{ at: string; event: string; method?: string; note?: string }>
    promptPay?: {
      phone: string
      amount: number
      ref: string
    }
  }
}

export type ApiBuyerWallet = {
  userId: string
  balance: number
  totalCredited: number
  totalDebited: number
}

export type ApiWalletLedger = {
  id: string
  userId: string
  type: 'credit' | 'debit'
  amount: number
  refType?: string | null
  refId?: string | null
  note?: string
  createdAt: string
  userName?: string
}

export type ApiChatSummary = {
  id: string
  shopId: string
  shopName: string
  buyerId: string
  buyerName: string
  productId?: string | null
  orderId?: string | null
  updatedAt: string
  lastMessage: { body: string; senderId: string; createdAt: string } | null
  unread: number
}

export type ApiChatMessage = {
  id: string
  senderId: string
  body: string
  createdAt: string
}

export type ApiWallet = {
  shopId: string
  balance: number
  pending: number
  totalEarned: number
  totalWithdrawn: number
}

export type ApiWithdrawal = {
  id: string
  shopId: string
  shopName?: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  note?: string
  adminNote?: string
  bankName?: string
  bankAccountName?: string
  bankAccountNumber?: string
  createdAt: string
  processedAt?: string | null
}

export type PlatformSettings = {
  commissionRate: number
  promptPayPhone: string
  bankAccount: {
    bank: string
    accountName: string
    accountNumber: string
  }
  freeShippingMin?: number
  shippingFee?: number
  paymentMethods?: { cod: boolean; transfer: boolean; card?: boolean }
  /** 0 = ไม่จำกัด · ยอดรวมตะกร้าสูงกว่านี้ใช้ COD ไม่ได้ */
  codMaxAmount?: number
  carriers?: string[]
  defaultCarrier?: string
}

export type AppContent = {
  homeShortcuts: Array<{
    id: string
    icon: string
    label: string
    link: string
    active?: boolean
    sort?: number
  }>
  home: { recommendedTitle: string; showTagline: boolean }
  flash: { title: string; linkLabel: string; link: string }
  bannerCta: string
  mall: {
    brandLabel: string
    title: string
    subtitle: string
    gridTitle: string
    badgeFilter: string
    categorySlugs: string[]
  }
  livePage: { title: string; subtitle: string }
  /** @deprecated ใช้ feedPosts API แทน — เก็บไว้เพื่อไม่พังข้อมูลเก่า */
  lives: Array<{
    id: string
    title: string
    viewers: string
    host: string
    active?: boolean
    sort?: number
  }>
  search: { placeholder: string; popularTitle: string }
  productShippingTemplate: string
  auth: { loginHint: string; buyerPitch: string; sellerPitch: string }
  legal: { privacy: string; terms: string; returnPolicy: string }
  /** ข้อความที่ผู้ขายเห็นใน Seller Center */
  seller: {
    announcement: string
    tipTitle: string
    tipBody: string
  }
  help: {
    title: string
    subtitle: string
    formTitle: string
    formHint: string
    channelsTitle: string
    topics: string[]
    channels: Array<{
      id: string
      type: 'line' | 'facebook' | 'phone' | 'email' | 'other'
      label: string
      value: string
      link?: string
      active?: boolean
      sort?: number
    }>
  }
}

export type ApiHelpTicket = {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  topic: string
  message: string
  orderId?: string | null
  status: 'open' | 'replied' | 'closed'
  adminReply?: string | null
  repliedAt?: string | null
  createdAt: string
  updatedAt: string
  userName?: string
  userEmail?: string
}

export type ApiBanner = {
  id: string
  title: string
  subtitle: string
  /** รูปแบนเนอร์ — ถ้ามีจะแสดงเป็นภาพแทนการ์ดสีล้วน */
  image?: string | null
  tone: 'orange' | 'coral' | 'amber' | 'pink' | 'red' | 'blue' | 'green' | 'purple' | 'teal' | 'black'
  link?: string
  active?: boolean
  sort?: number
}

export type ApiCategory = {
  id: string
  slug: string
  name: string
  icon: string
  color: string
}

export type ApiReturn = {
  id: string
  orderId: string
  userId: string
  shopId: string
  shopName?: string
  reason: string
  reasonDetail?: string
  evidenceUrls?: string[]
  refundMethod?: 'wallet' | 'original'
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'refunded'
  items: Array<{
    productId: string
    shopId: string
    name: string
    image: string
    price: number
    qty: number
  }>
  createdAt: string
  processedAt?: string | null
  adminNote?: string
  refundedToWallet?: number
}

export type ApiReview = {
  id: string
  orderId: string
  productId: string
  userId: string
  userName?: string
  rating: number
  comment: string
  createdAt: string
}

export type ApiFeedPost = {
  id: string
  userId: string
  userName: string
  userRole?: string
  image: string
  caption: string
  productIds: string[]
  products?: ApiProduct[]
  status: 'pending' | 'active' | 'hidden'
  likeCount: number
  liked?: boolean
  createdAt: string
  updatedAt?: string
}

export type ApiNotification = {
  id: string
  userId: string
  type: string
  title: string
  body: string
  link?: string | null
  read: boolean
  createdAt: string
}

export type ApiVoucher = {
  code: string
  title: string
  description: string
  discount: number
  minSpend: number
  expiresAt: string
  active: boolean
  /** platform = ทั้งแอป, shop = ใช้กับร้านนั้นเท่านั้น */
  scope?: 'platform' | 'shop'
  shopId?: string | null
  shopName?: string | null
  claimedAt?: string
  usedAt?: string | null
  used?: boolean
}

export type Brand = {
  name: string
  tagline: string
  primaryColor: string
  /** สีไล่โทน / หัวแอป */
  secondaryColor?: string
  /** สีเน้นปุ่มรอง / badge */
  accentColor?: string
  logoText: string
  /** URL โลโก้รูป (อัปโหลด) — ว่างได้ */
  logoUrl?: string
}

export type CartItem = {
  productId: string
  variantId?: string | null
  variantName?: string | null
  qty: number
  selected: boolean
}

export function cartLineKey(productId: string, variantId?: string | null) {
  return `${productId}::${variantId || ''}`
}
