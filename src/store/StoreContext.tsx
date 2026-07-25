import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  addressApi,
  authApi,
  cartApi,
  chatApi,
  metaApi,
  notificationApi,
  orderApi,
  voucherApi,
  wishlistApi,
} from '../api'
import { getToken, setToken } from '../api/client'
import type {
  ApiAddress,
  ApiNotification,
  ApiOrder,
  ApiUser,
  ApiVoucher,
  Brand,
  CartItem,
  OrderStatus,
  Shop,
} from '../api/types'
import { cartLineKey } from '../api/types'
import { loadJson, saveJson } from './storage'
import { useCatalog } from './CatalogContext'

type StoreContextValue = {
  user: ApiUser | null
  shop: Shop | null
  bootstrapping: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>
  loginWithPhone: (phone: string, code: string) => Promise<{ ok: boolean; message: string }>
  requestPhoneOtp: (phone: string) => Promise<{ ok: boolean; message: string; demoCode?: string }>
  loginWithGoogle: (payload?: {
    credential?: string
    demoEmail?: string
    demoName?: string
  }) => Promise<{ ok: boolean; message: string }>
  loginWithLine: (payload?: {
    accessToken?: string
    code?: string
    demoName?: string
  }) => Promise<{ ok: boolean; message: string }>
  register: (payload: {
    name: string
    email: string
    phone: string
    password: string
    role?: 'buyer' | 'seller'
  }) => Promise<{ ok: boolean; message: string }>
  logout: () => void
  updateProfile: (payload: Partial<Pick<ApiUser, 'name' | 'phone'>>) => Promise<void>
  refreshSession: () => Promise<void>

  cart: CartItem[]
  cartCount: number
  cartSelectedTotal: number
  addToCart: (
    productId: string,
    qty?: number,
    variant?: { id: string; name: string } | null,
  ) => void
  setQty: (lineKey: string, qty: number) => void
  toggleCartItem: (lineKey: string) => void
  toggleSelectAll: (selected: boolean) => void
  removeFromCart: (lineKey: string) => void
  clearSelectedFromCart: () => void
  prepareBuyNow: (
    productId: string,
    variant?: { id: string; name: string } | null,
  ) => void

  wishlist: string[]
  toggleWishlist: (productId: string) => Promise<void>
  isWishlisted: (productId: string) => boolean
  refreshWishlist: () => Promise<void>

  addresses: ApiAddress[]
  refreshAddresses: () => Promise<void>
  addAddress: (address: Omit<ApiAddress, 'id' | 'userId'>) => Promise<void>
  setDefaultAddress: (id: string) => Promise<void>
  removeAddress: (id: string) => Promise<void>
  defaultAddress: ApiAddress | null

  vouchers: ApiVoucher[]
  refreshVouchers: () => Promise<void>
  claimedVouchers: ApiVoucher[]
  refreshClaimedVouchers: () => Promise<void>
  claimVoucher: (code: string) => Promise<void>
  upsertVoucher: (voucher: ApiVoucher) => Promise<void>
  deleteVoucher: (code: string) => Promise<void>

  orders: ApiOrder[]
  refreshOrders: () => Promise<void>
  placeOrder: (payload: {
    addressId: string
    paymentMethod: ApiOrder['paymentMethod']
    voucherCode?: string
  }) => Promise<{ ok: boolean; message: string; orderId?: string }>
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    extra?: { trackingNumber?: string; carrier?: string },
  ) => Promise<void>
  payOrder: (
    orderId: string,
    extra?: { method?: string; slipNote?: string },
  ) => Promise<{ ok: boolean; message: string }>
  chatUnread: number
  refreshChatUnread: () => Promise<void>

  brand: Brand
  refreshBrand: () => Promise<void>
  updateBrand: (payload: Partial<Brand>) => Promise<void>

  notifications: ApiNotification[]
  unreadCount: number
  refreshNotifications: () => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>

  isAdmin: boolean
  adminLogin: (username: string, password: string) => Promise<{ ok: boolean; message: string }>
  adminLogout: () => void
  listUsers: () => Promise<ApiUser[]>
}

const StoreContext = createContext<StoreContextValue | null>(null)
const CART_KEY = 'great.cart'

const defaultBrand: Brand = {
  name: 'Great App',
  tagline: 'ช้อปง่าย ได้ของดี',
  primaryColor: '#ee4d2d',
  secondaryColor: '#ff7337',
  accentColor: '#ffb000',
  logoText: 'Great App',
  logoUrl: '',
}

function mergeCartItems(local: CartItem[], remote: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>()
  for (const item of remote) {
    map.set(cartLineKey(item.productId, item.variantId), { ...item })
  }
  for (const item of local) {
    const key = cartLineKey(item.productId, item.variantId)
    const existing = map.get(key)
    if (existing) {
      map.set(key, {
        ...existing,
        qty: Math.max(existing.qty, item.qty),
        selected: Boolean(existing.selected || item.selected),
        variantName: existing.variantName || item.variantName || null,
      })
    } else {
      map.set(key, { ...item })
    }
  }
  return [...map.values()]
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { getProductById, refreshProducts } = useCatalog()
  const [user, setUser] = useState<ApiUser | null>(null)
  const [shop, setShop] = useState<Shop | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [cart, setCart] = useState<CartItem[]>(() => loadJson(CART_KEY, []))
  const [wishlist, setWishlist] = useState<string[]>([])
  const [addresses, setAddresses] = useState<ApiAddress[]>([])
  const [vouchers, setVouchers] = useState<ApiVoucher[]>([])
  const [claimedVouchers, setClaimedVouchers] = useState<ApiVoucher[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [brand, setBrand] = useState<Brand>(defaultBrand)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [chatUnread, setChatUnread] = useState(0)
  const cartSyncReady = useRef(false)
  const cartSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => saveJson(CART_KEY, cart), [cart])

  useEffect(() => {
    if (!user || !cartSyncReady.current) return
    if (cartSaveTimer.current) clearTimeout(cartSaveTimer.current)
    cartSaveTimer.current = setTimeout(() => {
      void cartApi.put(cart).catch(() => {})
    }, 400)
    return () => {
      if (cartSaveTimer.current) clearTimeout(cartSaveTimer.current)
    }
  }, [cart, user])

  useEffect(() => {
    const primary = brand.primaryColor || '#ee4d2d'
    const secondary = brand.secondaryColor || '#ff7337'
    const accent = brand.accentColor || '#ffb000'
    const root = document.documentElement
    root.style.setProperty('--brand', primary)
    root.style.setProperty('--brand-secondary', secondary)
    root.style.setProperty('--brand-accent', accent)
    root.style.setProperty('--brand-grad', `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`)
    root.style.setProperty('--brand-gradient', `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`)
    root.style.setProperty('--brand-soft', `color-mix(in srgb, ${primary} 14%, white)`)
    document.title = brand.name
  }, [brand])

  const refreshSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setShop(null)
      return
    }
    try {
      const res = await authApi.me()
      setUser(res.user)
      setShop(res.shop)
    } catch {
      setToken(null)
      setUser(null)
      setShop(null)
    }
  }, [])

  const refreshWishlist = useCallback(async () => {
    if (!getToken()) {
      setWishlist([])
      return
    }
    try {
      const res = await wishlistApi.list()
      setWishlist(res.productIds)
    } catch {
      setWishlist([])
    }
  }, [])

  const refreshAddresses = useCallback(async () => {
    if (!getToken()) {
      setAddresses([])
      return
    }
    try {
      const res = await addressApi.list()
      setAddresses(res.addresses)
    } catch {
      setAddresses([])
    }
  }, [])

  const refreshVouchers = useCallback(async () => {
    try {
      const res = await voucherApi.list()
      setVouchers(res.vouchers)
    } catch {
      setVouchers([])
    }
  }, [])

  const refreshClaimedVouchers = useCallback(async () => {
    if (!getToken()) {
      setClaimedVouchers([])
      return
    }
    try {
      const res = await voucherApi.mine()
      setClaimedVouchers(res.vouchers)
    } catch {
      setClaimedVouchers([])
    }
  }, [])

  const claimVoucher = useCallback(
    async (code: string) => {
      await voucherApi.claim(code)
      await refreshClaimedVouchers()
      await refreshVouchers()
    },
    [refreshClaimedVouchers, refreshVouchers],
  )

  const refreshOrders = useCallback(async () => {
    if (!getToken()) {
      setOrders([])
      return
    }
    try {
      const me = await authApi.me()
      const res =
        me.user.role === 'admin' || me.user.role === 'seller'
          ? await orderApi.seller()
          : await orderApi.mine()
      setOrders(res.orders)
    } catch {
      try {
        const res = await orderApi.mine()
        setOrders(res.orders)
      } catch {
        setOrders([])
      }
    }
  }, [])

  const refreshBrand = useCallback(async () => {
    try {
      const res = await metaApi.brand()
      setBrand(res.brand)
    } catch {
      /* keep default */
    }
  }, [])

  const refreshNotifications = useCallback(async () => {
    if (!getToken()) {
      setNotifications([])
      setUnreadCount(0)
      return
    }
    try {
      const res = await notificationApi.list()
      setNotifications(res.notifications)
      setUnreadCount(res.unreadCount)
    } catch {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [])

  const refreshChatUnread = useCallback(async () => {
    if (!getToken()) {
      setChatUnread(0)
      return
    }
    try {
      const res = await chatApi.unread()
      setChatUnread(res.count)
    } catch {
      setChatUnread(0)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await Promise.all([refreshSession(), refreshVouchers(), refreshBrand()])
      setBootstrapping(false)
    })()
  }, [refreshSession, refreshVouchers, refreshBrand])

  useEffect(() => {
    if (user) {
      void refreshWishlist()
      void refreshAddresses()
      void refreshOrders()
      void refreshNotifications()
      void refreshChatUnread()
      void refreshClaimedVouchers()
      cartSyncReady.current = false
      void cartApi
        .get()
        .then((res) => {
          const local = loadJson<CartItem[]>(CART_KEY, [])
          const merged = mergeCartItems(local, res.items || [])
          setCart(merged)
          saveJson(CART_KEY, merged)
          return cartApi.put(merged)
        })
        .catch(() => {})
        .finally(() => {
          cartSyncReady.current = true
        })
    } else {
      cartSyncReady.current = false
      setWishlist([])
      setAddresses([])
      setOrders([])
      setNotifications([])
      setUnreadCount(0)
      setChatUnread(0)
      setClaimedVouchers([])
    }
  }, [
    user,
    refreshWishlist,
    refreshAddresses,
    refreshOrders,
    refreshNotifications,
    refreshChatUnread,
    refreshClaimedVouchers,
  ])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await authApi.login(email, password)
      setToken(res.token)
      setUser(res.user)
      const me = await authApi.me()
      setShop(me.shop)
      return { ok: true, message: 'เข้าสู่ระบบสำเร็จ' }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ',
      }
    }
  }, [])

  const applyAuthSession = useCallback(async (token: string, message: string) => {
    setToken(token)
    const me = await authApi.me()
    setUser(me.user)
    setShop(me.shop)
    return { ok: true, message }
  }, [])

  const requestPhoneOtp = useCallback(async (phone: string) => {
    try {
      const res = await authApi.requestOtp(phone)
      return { ok: true, message: res.message, demoCode: res.demoCode }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'ส่ง OTP ไม่สำเร็จ',
      }
    }
  }, [])

  const loginWithPhone = useCallback(
    async (phone: string, code: string) => {
      try {
        const res = await authApi.verifyOtp(phone, code)
        return applyAuthSession(res.token, res.message || 'เข้าสู่ระบบด้วยเบอร์สำเร็จ')
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'ยืนยัน OTP ไม่สำเร็จ',
        }
      }
    },
    [applyAuthSession],
  )

  const loginWithGoogle = useCallback(
    async (payload?: { credential?: string; demoEmail?: string; demoName?: string }) => {
      try {
        const res = await authApi.googleLogin(payload || {})
        return applyAuthSession(res.token, res.message || 'เข้าสู่ระบบด้วย Google สำเร็จ')
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Google login ไม่สำเร็จ',
        }
      }
    },
    [applyAuthSession],
  )

  const loginWithLine = useCallback(
    async (payload?: { accessToken?: string; code?: string; demoName?: string }) => {
      try {
        const res = await authApi.lineLogin(payload || {})
        return applyAuthSession(res.token, res.message || 'เข้าสู่ระบบด้วย LINE สำเร็จ')
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'LINE login ไม่สำเร็จ',
        }
      }
    },
    [applyAuthSession],
  )

  const register = useCallback(
    async (payload: {
      name: string
      email: string
      phone: string
      password: string
      role?: 'buyer' | 'seller'
    }) => {
      try {
        const res = await authApi.register(payload)
        setToken(res.token)
        setUser(res.user)
        setShop(null)
        return { ok: true, message: 'สมัครสมาชิกสำเร็จ' }
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'สมัครไม่สำเร็จ',
        }
      }
    },
    [],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    setShop(null)
  }, [])

  const updateProfile = useCallback(async (payload: Partial<Pick<ApiUser, 'name' | 'phone'>>) => {
    const res = await authApi.updateMe(payload)
    setUser(res.user)
  }, [])

  const addToCart = useCallback(
    (productId: string, qty = 1, variant?: { id: string; name: string } | null) => {
      const variantId = variant?.id || null
      const variantName = variant?.name || null
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.productId === productId && (item.variantId || null) === variantId,
        )
        if (existing) {
          return prev.map((item) =>
            item.productId === productId && (item.variantId || null) === variantId
              ? { ...item, qty: item.qty + qty, selected: true }
              : item,
          )
        }
        return [...prev, { productId, variantId, variantName, qty, selected: true }]
      })
    },
    [],
  )

  const setQty = useCallback((lineKey: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          cartLineKey(item.productId, item.variantId) === lineKey ? { ...item, qty } : item,
        )
        .filter((item) => item.qty > 0),
    )
  }, [])

  const toggleCartItem = useCallback((lineKey: string) => {
    setCart((prev) =>
      prev.map((item) =>
        cartLineKey(item.productId, item.variantId) === lineKey
          ? { ...item, selected: !item.selected }
          : item,
      ),
    )
  }, [])

  const toggleSelectAll = useCallback((selected: boolean) => {
    setCart((prev) => prev.map((item) => ({ ...item, selected })))
  }, [])

  const removeFromCart = useCallback((lineKey: string) => {
    setCart((prev) =>
      prev.filter((item) => cartLineKey(item.productId, item.variantId) !== lineKey),
    )
  }, [])

  const clearSelectedFromCart = useCallback(() => {
    setCart((prev) => prev.filter((item) => !item.selected))
  }, [])

  const prepareBuyNow = useCallback(
    (productId: string, variant?: { id: string; name: string } | null) => {
      const variantId = variant?.id || null
      const variantName = variant?.name || null
      setCart((prev) => {
        const exists = prev.find(
          (item) => item.productId === productId && (item.variantId || null) === variantId,
        )
        const cleared = prev.map((item) => ({ ...item, selected: false }))
        if (exists) {
          return cleared.map((item) =>
            item.productId === productId && (item.variantId || null) === variantId
              ? { ...item, qty: Math.max(item.qty, 1), selected: true }
              : item,
          )
        }
        return [
          ...cleared,
          { productId, variantId, variantName, qty: 1, selected: true },
        ]
      })
    },
    [],
  )

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!user) throw new Error('กรุณาเข้าสู่ระบบ')
      if (wishlist.includes(productId)) {
        await wishlistApi.remove(productId)
        setWishlist((prev) => prev.filter((id) => id !== productId))
      } else {
        await wishlistApi.add(productId)
        setWishlist((prev) => [...prev, productId])
      }
    },
    [user, wishlist],
  )

  const isWishlisted = useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist],
  )

  const addAddress = useCallback(
    async (address: Omit<ApiAddress, 'id' | 'userId'>) => {
      await addressApi.create(address)
      await refreshAddresses()
    },
    [refreshAddresses],
  )

  const setDefaultAddress = useCallback(
    async (id: string) => {
      await addressApi.setDefault(id)
      await refreshAddresses()
    },
    [refreshAddresses],
  )

  const removeAddress = useCallback(
    async (id: string) => {
      await addressApi.remove(id)
      await refreshAddresses()
    },
    [refreshAddresses],
  )

  const upsertVoucher = useCallback(
    async (voucher: ApiVoucher) => {
      const exists = vouchers.some((v) => v.code === voucher.code)
      if (exists) await voucherApi.update(voucher.code, voucher)
      else await voucherApi.create(voucher)
      await refreshVouchers()
    },
    [vouchers, refreshVouchers],
  )

  const deleteVoucher = useCallback(
    async (code: string) => {
      await voucherApi.remove(code)
      await refreshVouchers()
    },
    [refreshVouchers],
  )

  const placeOrder = useCallback(
    async (payload: {
      addressId: string
      paymentMethod: ApiOrder['paymentMethod']
      voucherCode?: string
    }) => {
      if (!user) return { ok: false, message: 'กรุณาเข้าสู่ระบบก่อนสั่งซื้อ' }
      const selected = cart.filter((item) => item.selected)
      if (!selected.length) return { ok: false, message: 'ยังไม่มีสินค้าที่เลือก' }
      try {
        const res = await orderApi.checkout({
          items: selected.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            variantId: item.variantId || undefined,
          })),
          addressId: payload.addressId,
          paymentMethod: payload.paymentMethod,
          voucherCode: payload.voucherCode,
        })
        setCart((prev) => prev.filter((item) => !item.selected))
        await refreshOrders()
        await refreshSession()
        await refreshProducts()
        await refreshNotifications()
        await refreshClaimedVouchers()
        const count = res.orders?.length || 1
        return {
          ok: true,
          message:
            count > 1
              ? `สร้าง ${count} ออเดอร์ (แยกตามร้าน)`
              : 'สร้างคำสั่งซื้อสำเร็จ',
          orderId: res.order.id,
        }
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'สั่งซื้อไม่สำเร็จ',
        }
      }
    },
    [user, cart, refreshOrders, refreshSession, refreshProducts, refreshNotifications, refreshClaimedVouchers],
  )

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      extra?: { trackingNumber?: string; carrier?: string },
    ) => {
      await orderApi.setStatus(orderId, status, extra)
      await refreshOrders()
      await refreshNotifications()
    },
    [refreshOrders, refreshNotifications],
  )

  const payOrder = useCallback(
    async (orderId: string, extra?: { method?: string; slipNote?: string }) => {
      try {
        await orderApi.pay(orderId, extra)
        await refreshOrders()
        await refreshNotifications()
        return { ok: true, message: 'ชำระเงินสำเร็จ (จำลอง)' }
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'ชำระเงินไม่สำเร็จ',
        }
      }
    },
    [refreshOrders, refreshNotifications],
  )

  const markAllNotificationsRead = useCallback(async () => {
    await notificationApi.readAll()
    await refreshNotifications()
  }, [refreshNotifications])

  const markNotificationRead = useCallback(
    async (id: string) => {
      await notificationApi.read(id)
      await refreshNotifications()
    },
    [refreshNotifications],
  )

  const updateBrand = useCallback(async (payload: Partial<Brand>) => {
    const res = await metaApi.updateBrand(payload)
    setBrand(res.brand)
  }, [])

  const adminLogin = useCallback(async (username: string, password: string) => {
    const email = username.trim().toLowerCase() === 'admin' ? 'admin@great.app' : username.trim()
    try {
      const res = await authApi.adminLogin(email, password)
      setToken(res.token)
      setUser(res.user)
      const me = await authApi.me()
      if (me.user.role !== 'admin') {
        setToken(null)
        setUser(null)
        setShop(null)
        return { ok: false, message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }
      }
      setShop(me.shop)
      return { ok: true, message: res.message || 'เข้าสู่ระบบแอดมินสำเร็จ' }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ',
      }
    }
  }, [])

  const adminLogout = logout

  const listUsers = useCallback(async () => {
    const res = await metaApi.users()
    return res.users
  }, [])

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])
  const cartSelectedTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (!item.selected) return sum
      const product = getProductById(item.productId)
      if (!product) return sum
      const variant = item.variantId
        ? product.variants?.find((v) => v.id === item.variantId)
        : null
      const price =
        variant && variant.price != null ? Number(variant.price) : product.price
      return sum + price * item.qty
    }, 0)
  }, [cart, getProductById])

  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault) ?? addresses[0] ?? null,
    [addresses],
  )

  const isAdmin = user?.role === 'admin'

  const value = useMemo<StoreContextValue>(
    () => ({
      user,
      shop,
      bootstrapping,
      login,
      loginWithPhone,
      requestPhoneOtp,
      loginWithGoogle,
      loginWithLine,
      register,
      logout,
      updateProfile,
      refreshSession,
      cart,
      cartCount,
      cartSelectedTotal,
      addToCart,
      setQty,
      toggleCartItem,
      toggleSelectAll,
      removeFromCart,
      clearSelectedFromCart,
      prepareBuyNow,
      wishlist,
      toggleWishlist,
      isWishlisted,
      refreshWishlist,
      addresses,
      refreshAddresses,
      addAddress,
      setDefaultAddress,
      removeAddress,
      defaultAddress,
      vouchers,
      refreshVouchers,
      claimedVouchers,
      refreshClaimedVouchers,
      claimVoucher,
      upsertVoucher,
      deleteVoucher,
      orders,
      refreshOrders,
      placeOrder,
      updateOrderStatus,
      payOrder,
      chatUnread,
      refreshChatUnread,
      brand,
      refreshBrand,
      updateBrand,
      notifications,
      unreadCount,
      refreshNotifications,
      markAllNotificationsRead,
      markNotificationRead,
      isAdmin,
      adminLogin,
      adminLogout,
      listUsers,
    }),
    [
      user,
      shop,
      bootstrapping,
      login,
      loginWithPhone,
      requestPhoneOtp,
      loginWithGoogle,
      loginWithLine,
      register,
      logout,
      updateProfile,
      refreshSession,
      cart,
      cartCount,
      cartSelectedTotal,
      addToCart,
      setQty,
      toggleCartItem,
      toggleSelectAll,
      removeFromCart,
      clearSelectedFromCart,
      prepareBuyNow,
      wishlist,
      toggleWishlist,
      isWishlisted,
      refreshWishlist,
      addresses,
      refreshAddresses,
      addAddress,
      setDefaultAddress,
      removeAddress,
      defaultAddress,
      vouchers,
      refreshVouchers,
      claimedVouchers,
      refreshClaimedVouchers,
      claimVoucher,
      upsertVoucher,
      deleteVoucher,
      orders,
      refreshOrders,
      placeOrder,
      updateOrderStatus,
      payOrder,
      chatUnread,
      refreshChatUnread,
      brand,
      refreshBrand,
      updateBrand,
      notifications,
      unreadCount,
      refreshNotifications,
      markAllNotificationsRead,
      markNotificationRead,
      isAdmin,
      adminLogin,
      adminLogout,
      listUsers,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function statusLabel(status: OrderStatus) {
  switch (status) {
    case 'unpaid':
      return 'ที่ต้องชำระ'
    case 'to_ship':
      return 'ที่ต้องจัดส่ง'
    case 'shipping':
      return 'ที่ต้องได้รับ'
    case 'to_review':
      return 'รีวิว'
    case 'completed':
      return 'สำเร็จ'
    case 'cancelled':
      return 'ยกเลิก'
    case 'refunded':
      return 'คืนเงินแล้ว'
    default:
      return status
  }
}
