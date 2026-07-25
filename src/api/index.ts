import { api, setToken, getToken } from './client'
import type {
  ApiAddress,
  ApiBanner,
  ApiCategory,
  ApiChatMessage,
  ApiChatSummary,
  ApiHelpTicket,
  ApiNotification,
  ApiOrder,
  ApiProduct,
  ApiReturn,
  ApiReview,
  ApiUser,
  ApiVoucher,
  ApiWallet,
  ApiWithdrawal,
  AppContent,
  Brand,
  OrderStatus,
  PlatformSettings,
  Shop,
} from './types'

export const authApi = {
  register: (body: {
    name: string
    email: string
    phone: string
    password: string
    role?: 'buyer' | 'seller'
  }) => api<{ ok: true; token: string; user: ApiUser }>('/auth/register', { method: 'POST', json: body }),
  login: (email: string, password: string) =>
    api<{ ok: true; token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      json: { email, password },
    }),
  providers: () =>
    api<{
      ok: true
      providers: {
        phone: boolean
        google: boolean
        line: boolean
        email: boolean
        googleClientId: string | null
        lineChannelId: string | null
        lineRedirectUri: string | null
        lineReady?: boolean
        demoOtp: boolean
        demoSocial: boolean
      }
    }>('/auth/providers'),
  requestOtp: (phone: string) =>
    api<{ ok: true; message: string; demoCode?: string; expiresInSec: number }>(
      '/auth/otp/request',
      { method: 'POST', json: { phone } },
    ),
  verifyOtp: (phone: string, code: string, name?: string) =>
    api<{ ok: true; token: string; user: ApiUser; message?: string }>('/auth/otp/verify', {
      method: 'POST',
      json: { phone, code, name },
    }),
  googleLogin: (body: { credential?: string; demoEmail?: string; demoName?: string }) =>
    api<{ ok: true; token: string; user: ApiUser; message?: string }>('/auth/oauth/google', {
      method: 'POST',
      json: body,
    }),
  lineLogin: (body: { accessToken?: string; code?: string; demoName?: string }) =>
    api<{ ok: true; token: string; user: ApiUser; message?: string }>('/auth/oauth/line', {
      method: 'POST',
      json: body,
    }),
  me: () => api<{ ok: true; user: ApiUser; shop: Shop | null }>('/auth/me'),
  updateMe: (body: Partial<Pick<ApiUser, 'name' | 'phone'>>) =>
    api<{ ok: true; user: ApiUser }>('/auth/me', { method: 'PATCH', json: body }),
  logout: () => setToken(null),
}

export const catalogApi = {
  products: (params?: { q?: string; category?: string; shopId?: string; flash?: string }) => {
    const qs = new URLSearchParams()
    if (params?.q) qs.set('q', params.q)
    if (params?.category) qs.set('category', params.category)
    if (params?.shopId) qs.set('shopId', params.shopId)
    if (params?.flash) qs.set('flash', params.flash)
    const q = qs.toString()
    return api<{ ok: true; products: ApiProduct[] }>(`/products${q ? `?${q}` : ''}`)
  },
  product: (id: string) => api<{ ok: true; product: ApiProduct }>(`/products/${id}`),
  mine: () => api<{ ok: true; products: ApiProduct[] }>('/products/manage/mine'),
  create: (body: Partial<ApiProduct>) =>
    api<{ ok: true; product: ApiProduct }>('/products', { method: 'POST', json: body }),
  update: (id: string, body: Partial<ApiProduct>) =>
    api<{ ok: true; product: ApiProduct }>(`/products/${id}`, { method: 'PATCH', json: body }),
  remove: (id: string) => api<{ ok: true }>(`/products/${id}`, { method: 'DELETE' }),
}

export const shopApi = {
  list: () => api<{ ok: true; shops: Shop[] }>('/shops'),
  all: () => api<{ ok: true; shops: Shop[] }>('/shops/all'),
  pending: () => api<{ ok: true; shops: Shop[] }>('/shops/pending'),
  mine: () => api<{ ok: true; shop: Shop | null }>('/shops/mine'),
  bySlug: (slug: string) =>
    api<{ ok: true; shop: Shop; products: ApiProduct[] }>(`/shops/${slug}`),
  register: (body: { name: string; description?: string; location?: string }) =>
    api<{ ok: true; shop: Shop }>('/shops/register', { method: 'POST', json: body }),
  updateMine: (body: Partial<Shop>) =>
    api<{ ok: true; shop: Shop }>('/shops/mine', { method: 'PATCH', json: body }),
  setStatus: (id: string, status: Shop['status']) =>
    api<{ ok: true; shop: Shop }>(`/shops/${id}/status`, { method: 'PATCH', json: { status } }),
}

export const orderApi = {
  mine: () => api<{ ok: true; orders: ApiOrder[] }>('/orders/mine'),
  seller: () => api<{ ok: true; orders: ApiOrder[] }>('/orders/seller'),
  earnings: () =>
    api<{
      ok: true
      rows: Array<{
        orderId: string
        createdAt: string
        orderStatus: string
        settlementStatus: string
        gross: number
        fee: number
        net: number
      }>
      totals: { gross: number; fee: number; net: number }
    }>('/orders/seller/earnings'),
  get: (id: string) => api<{ ok: true; order: ApiOrder }>(`/orders/${id}`),
  checkout: (body: {
    items: Array<{ productId: string; qty: number; variantId?: string }>
    addressId: string
    paymentMethod: 'cod' | 'transfer' | 'card'
    voucherCode?: string
  }) =>
    api<{ ok: true; order: ApiOrder; orders?: ApiOrder[]; orderIds?: string[] }>(
      '/orders/checkout',
      { method: 'POST', json: body },
    ),
  setStatus: (
    id: string,
    status: OrderStatus,
    extra?: { trackingNumber?: string; carrier?: string },
  ) =>
    api<{ ok: true; order: ApiOrder }>(`/orders/${id}/status`, {
      method: 'PATCH',
      json: { status, ...extra },
    }),
  pay: (id: string, body?: { method?: string; slipNote?: string }) =>
    api<{ ok: true; order: ApiOrder }>(`/orders/${id}/pay`, {
      method: 'POST',
      json: body ?? {},
    }),
}

export const chatApi = {
  list: () => api<{ ok: true; chats: ApiChatSummary[] }>('/chats'),
  unread: () => api<{ ok: true; count: number }>('/chats/unread-count'),
  open: (body: { shopId: string; productId?: string; orderId?: string; message?: string }) =>
    api<{ ok: true; chatId: string; chat: ApiChatSummary }>('/chats', {
      method: 'POST',
      json: body,
    }),
  get: (id: string) =>
    api<{
      ok: true
      chat: ApiChatSummary & {
        shopOwnerId?: string
        messages: ApiChatMessage[]
        product: { id: string; name: string; image: string; price: number } | null
      }
    }>(`/chats/${id}`),
  send: (id: string, body: string) =>
    api<{ ok: true; message: ApiChatMessage }>(`/chats/${id}/messages`, {
      method: 'POST',
      json: { body },
    }),
  read: (id: string) => api<{ ok: true }>(`/chats/${id}/read`, { method: 'PATCH' }),
}

export const walletApi = {
  mine: () =>
    api<{
      ok: true
      wallet: ApiWallet | null
      withdrawals: ApiWithdrawal[]
      settings: { commissionRate: number }
    }>('/wallet/mine'),
  withdraw: (amount: number, note?: string) =>
    api<{ ok: true; withdrawal: ApiWithdrawal; wallet: ApiWallet }>('/wallet/withdraw', {
      method: 'POST',
      json: { amount, note },
    }),
  withdrawals: () => api<{ ok: true; withdrawals: ApiWithdrawal[] }>('/wallet/withdrawals'),
  setWithdrawalStatus: (id: string, status: 'approved' | 'rejected', note?: string) =>
    api<{ ok: true; withdrawal: ApiWithdrawal }>(`/wallet/withdrawals/${id}`, {
      method: 'PATCH',
      json: { status, note },
    }),
  settings: () => api<{ ok: true; settings: PlatformSettings }>('/wallet/settings'),
  updateSettings: (body: Partial<PlatformSettings>) =>
    api<{ ok: true; settings: PlatformSettings }>('/wallet/settings', {
      method: 'PUT',
      json: body,
    }),
}

export const paymentApi = {
  methods: () =>
    api<{
      ok: true
      methods: Array<{
        id: string
        name: string
        description: string
        promptPayPhone?: string
        bankAccount?: PlatformSettings['bankAccount']
      }>
    }>('/payments/methods'),
}

export const uploadApi = {
  image: async (file: File) => {
    const form = new FormData()
    form.append('image', file)
    const headers = new Headers()
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    const res = await fetch('/api/upload', { method: 'POST', headers, body: form })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'อัปโหลดไม่สำเร็จ')
    return data as { ok: true; url: string }
  },
}

export const reviewApi = {
  list: (productId: string) =>
    api<{ ok: true; reviews: ApiReview[] }>(`/reviews?productId=${encodeURIComponent(productId)}`),
  create: (body: { orderId: string; productId: string; rating: number; comment?: string }) =>
    api<{ ok: true; review: ApiReview }>('/reviews', { method: 'POST', json: body }),
}

export const notificationApi = {
  list: () =>
    api<{ ok: true; notifications: ApiNotification[]; unreadCount: number }>('/notifications'),
  readAll: () => api<{ ok: true }>('/notifications/read-all', { method: 'PATCH' }),
  read: (id: string) =>
    api<{ ok: true; notification: ApiNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
}

export const voucherApi = {
  list: () => api<{ ok: true; vouchers: ApiVoucher[] }>('/vouchers'),
  mine: () => api<{ ok: true; vouchers: ApiVoucher[] }>('/vouchers/mine'),
  claim: (code: string) =>
    api<{ ok: true; voucher: ApiVoucher }>('/vouchers/claim', {
      method: 'POST',
      json: { code },
    }),
  create: (body: Partial<ApiVoucher>) =>
    api<{ ok: true; voucher: ApiVoucher }>('/vouchers', { method: 'POST', json: body }),
  update: (code: string, body: Partial<ApiVoucher>) =>
    api<{ ok: true; voucher: ApiVoucher }>(`/vouchers/${code}`, { method: 'PUT', json: body }),
  remove: (code: string) => api<{ ok: true }>(`/vouchers/${code}`, { method: 'DELETE' }),
}

export const addressApi = {
  list: () => api<{ ok: true; addresses: ApiAddress[] }>('/addresses'),
  create: (body: Omit<ApiAddress, 'id' | 'userId'>) =>
    api<{ ok: true; address: ApiAddress }>('/addresses', { method: 'POST', json: body }),
  setDefault: (id: string) =>
    api<{ ok: true; address: ApiAddress }>(`/addresses/${id}/default`, { method: 'PATCH' }),
  remove: (id: string) => api<{ ok: true }>(`/addresses/${id}`, { method: 'DELETE' }),
}

export const wishlistApi = {
  list: () =>
    api<{ ok: true; productIds: string[]; products: ApiProduct[] }>('/wishlist'),
  add: (productId: string) =>
    api<{ ok: true }>(`/wishlist/${productId}`, { method: 'POST' }),
  remove: (productId: string) =>
    api<{ ok: true }>(`/wishlist/${productId}`, { method: 'DELETE' }),
}

export const metaApi = {
  brand: () => api<{ ok: true; brand: Brand }>('/brand'),
  updateBrand: (body: Partial<Brand>) =>
    api<{ ok: true; brand: Brand }>('/brand', { method: 'PUT', json: body }),
  categories: () =>
    api<{ ok: true; categories: ApiCategory[] }>('/categories'),
  createCategory: (body: Partial<ApiCategory>) =>
    api<{ ok: true; category: ApiCategory }>('/categories', { method: 'POST', json: body }),
  updateCategory: (id: string, body: Partial<ApiCategory>) =>
    api<{ ok: true; category: ApiCategory }>(`/categories/${id}`, { method: 'PUT', json: body }),
  deleteCategory: (id: string) => api<{ ok: true }>(`/categories/${id}`, { method: 'DELETE' }),
  banners: () => api<{ ok: true; banners: ApiBanner[] }>('/banners'),
  bannersAll: () => api<{ ok: true; banners: ApiBanner[] }>('/banners/all'),
  createBanner: (body: Partial<ApiBanner>) =>
    api<{ ok: true; banner: ApiBanner }>('/banners', { method: 'POST', json: body }),
  updateBanner: (id: string, body: Partial<ApiBanner>) =>
    api<{ ok: true; banner: ApiBanner }>(`/banners/${id}`, { method: 'PUT', json: body }),
  deleteBanner: (id: string) => api<{ ok: true }>(`/banners/${id}`, { method: 'DELETE' }),
  commissionReport: () =>
    api<{
      ok: true
      rows: Array<{
        orderId: string
        shopId: string
        shopName: string
        createdAt: string
        orderStatus: string
        settlementStatus: string
        gross: number
        fee: number
        net: number
      }>
      totals: { gross: number; fee: number; net: number }
    }>('/reports/commission'),
  stats: () =>
    api<{
      ok: true
      stats: {
        products: number
        orders: number
        users: number
        shops: number
        pendingShops: number
        pendingReturns: number
        openHelpTickets: number
        revenue: number
        platformFee: number
      }
    }>('/stats'),
  users: () => api<{ ok: true; users: ApiUser[] }>('/users'),
  updateUser: (id: string, body: { role?: string; banned?: boolean }) =>
    api<{ ok: true; user: ApiUser }>(`/users/${id}`, { method: 'PATCH', json: body }),
  appContent: () => api<{ ok: true; appContent: AppContent }>('/app-content'),
  updateAppContent: (body: Partial<AppContent>) =>
    api<{ ok: true; appContent: AppContent }>('/app-content', { method: 'PUT', json: body }),
  storefrontSettings: () =>
    api<{
      ok: true
      settings: Pick<
        PlatformSettings,
        'freeShippingMin' | 'shippingFee' | 'promptPayPhone' | 'bankAccount' | 'commissionRate'
      >
    }>('/storefront-settings'),
}

export const returnApi = {
  mine: () => api<{ ok: true; returns: ApiReturn[] }>('/returns/mine'),
  seller: () => api<{ ok: true; returns: ApiReturn[] }>('/returns/seller'),
  admin: () => api<{ ok: true; returns: ApiReturn[] }>('/returns/admin'),
  create: (body: { orderId: string; reason: string; itemProductIds?: string[] }) =>
    api<{ ok: true; return: ApiReturn }>('/returns', { method: 'POST', json: body }),
  setStatus: (id: string, status: 'approved' | 'rejected' | 'refunded', note?: string) =>
    api<{ ok: true; return: ApiReturn }>(`/returns/${id}`, {
      method: 'PATCH',
      json: { status, note },
    }),
}

export const helpApi = {
  mine: () => api<{ ok: true; tickets: ApiHelpTicket[] }>('/help/tickets/mine'),
  admin: () => api<{ ok: true; tickets: ApiHelpTicket[] }>('/help/tickets'),
  create: (body: { topic: string; message: string; phone?: string; orderId?: string }) =>
    api<{ ok: true; ticket: ApiHelpTicket }>('/help/tickets', { method: 'POST', json: body }),
  reply: (id: string, body: { adminReply?: string; status?: 'open' | 'replied' | 'closed' }) =>
    api<{ ok: true; ticket: ApiHelpTicket }>(`/help/tickets/${id}`, {
      method: 'PATCH',
      json: body,
    }),
}
