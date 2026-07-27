import type { AppContent } from '../api/types'

export const defaultAppContent: AppContent = {
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
      'เราเก็บข้อมูลที่จำเป็นต่อการสั่งซื้อและการให้บริการเท่านั้น และไม่ขายข้อมูลส่วนบุคคลแก่บุคคลภายนอกโดยไม่ได้รับความยินยอม คุณลบบัญชีได้ที่ การตั้งค่า → ลบบัญชี (ข้อมูลส่วนตัวจะถูกลบ ออเดอร์เก่ายังเก็บแบบไม่ระบุตัวตน) แพลตฟอร์มรับชำระด้วยเก็บเงินปลายทางและสแกน QR/PromptPay เท่านั้น',
    terms:
      'การใช้แอปถือว่ายอมรับเงื่อนไขการให้บริการของแพลตฟอร์ม รวมถึงการสั่งซื้อ การชำระเงิน และการจัดส่งตามที่ระบุในแต่ละคำสั่งซื้อ',
    returnPolicy:
      'ลูกค้าสามารถขอคืนสินค้าได้ตามเงื่อนไขของแต่ละร้านภายในระยะเวลาที่กำหนด โดยส่งคำขอผ่านหน้าคำสั่งซื้อ',
  },
  seller: {
    announcement: 'ยินดีต้อนรับสู่ Seller Center — ตรวจออเดอร์ที่ต้องจัดส่งและอัปเดตสต็อกเป็นประจำ',
    tipTitle: 'คำแนะนำด้านธุรกิจ',
    tipBody: 'ตอบแชทลูกค้าเร็ว และอัปเดตสถานะจัดส่งให้ครบ จะช่วยให้คะแนนร้านดีขึ้น',
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
