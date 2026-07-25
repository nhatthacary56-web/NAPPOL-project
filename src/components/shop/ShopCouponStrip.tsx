import { useMemo } from 'react'
import type { ApiVoucher } from '../../api/types'
import { formatPrice } from '../../data/catalog'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './ShopCouponStrip.css'

type Props = {
  vouchers: ApiVoucher[]
  title?: string
}

export function ShopCouponStrip({ vouchers, title = 'คูปองร้านนี้' }: Props) {
  const { user, claimVoucher, claimedVouchers } = useStore()
  const { toast } = useToast()

  const claimedCodes = useMemo(
    () => new Set(claimedVouchers.map((v) => v.code)),
    [claimedVouchers],
  )

  if (!vouchers.length) return null

  return (
    <section className="shop-coupons" aria-label={title}>
      <h2>{title}</h2>
      <div className="shop-coupons__list">
        {vouchers.map((voucher) => {
          const claimed = claimedCodes.has(voucher.code)
          return (
            <article key={voucher.code} className="shop-coupons__card">
              <div>
                <strong>ลด {formatPrice(voucher.discount)}</strong>
                <p>
                  ซื้อครบ {formatPrice(voucher.minSpend)} · {voucher.code}
                </p>
                {voucher.description ? <span>{voucher.description}</span> : null}
              </div>
              <button
                type="button"
                disabled={claimed}
                onClick={async () => {
                  if (!user) {
                    toast('เข้าสู่ระบบเพื่อเก็บคูปอง')
                    return
                  }
                  try {
                    await claimVoucher(voucher.code)
                    toast('เก็บคูปองแล้ว — ใช้ตอนชำระเงิน')
                  } catch (error) {
                    toast(error instanceof Error ? error.message : 'เก็บคูปองไม่สำเร็จ')
                  }
                }}
              >
                {claimed ? 'เก็บแล้ว' : 'เก็บ'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
