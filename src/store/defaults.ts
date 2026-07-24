import type { Voucher } from './types'

export const defaultVouchers: Voucher[] = [
  {
    code: 'GREAT50',
    title: 'ลด ฿50',
    description: 'เมื่อช้อปครบ ฿299',
    discount: 50,
    minSpend: 299,
    expiresAt: '2026-12-31',
    claimed: true,
  },
  {
    code: 'FREESHIP',
    title: 'ส่งฟรี',
    description: 'ลดค่าส่ง ฿40 เมื่อครบ ฿199',
    discount: 40,
    minSpend: 199,
    expiresAt: '2026-12-31',
    claimed: true,
  },
  {
    code: 'NEW100',
    title: 'สมาชิกใหม่ลด ฿100',
    description: 'เมื่อช้อปครบ ฿500',
    discount: 100,
    minSpend: 500,
    expiresAt: '2026-09-30',
    claimed: false,
  },
]
