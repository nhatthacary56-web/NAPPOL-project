export type Category = {
  id: string
  slug: string
  name: string
  icon: string
  color: string
}

export type Product = {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  sold: number
  stock?: number
  rating: number
  reviewCount?: number
  location: string
  categorySlug: string
  badge?: string
  flashSale?: boolean
  shopId?: string
  shopName?: string
  shopSlug?: string | null
}

export type Banner = {
  id: string
  title: string
  subtitle: string
  tone: 'orange' | 'coral' | 'amber'
  link?: string
  active?: boolean
  sort?: number
}

export const categories: Category[] = [
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

export const banners: Banner[] = [
  {
    id: 'b1',
    title: 'ลดแรงทุกวัน',
    subtitle: 'โค้ดส่วนลดสูงสุด ฿100',
    tone: 'orange',
  },
  {
    id: 'b2',
    title: 'Flash Sale',
    subtitle: 'หมดเวลาในอีกไม่กี่ชั่วโมง',
    tone: 'coral',
  },
  {
    id: 'b3',
    title: 'ส่งฟรีทั่วไทย',
    subtitle: 'เมื่อช้อปครบเงื่อนไข',
    tone: 'amber',
  },
]

export const seedProducts: Product[] = [
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

export function formatPrice(value: number) {
  return `฿${value.toLocaleString('th-TH')}`
}

export function formatSold(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}พัน`
  return String(value)
}
