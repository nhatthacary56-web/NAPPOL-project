export type Address = {
  id: string
  name: string
  phone: string
  line1: string
  district: string
  province: string
  postalCode: string
  isDefault?: boolean
}

export type User = {
  id: string
  name: string
  email: string
  phone: string
  coins: number
}

export type CartItem = {
  productId: string
  qty: number
  selected: boolean
}

export type OrderStatus = 'unpaid' | 'to_ship' | 'shipping' | 'to_review' | 'completed' | 'cancelled'

export type OrderItem = {
  productId: string
  name: string
  image: string
  price: number
  qty: number
}

export type Order = {
  id: string
  createdAt: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  discount: number
  total: number
  address: Address
  paymentMethod: 'cod' | 'transfer' | 'card'
  voucherCode?: string
}

export type Voucher = {
  code: string
  title: string
  description: string
  discount: number
  minSpend: number
  expiresAt: string
  claimed: boolean
}

export type AppNotification = {
  id: string
  type: 'promo' | 'order' | 'system'
  title: string
  body: string
  createdAt: string
  read: boolean
}
