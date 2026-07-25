import { useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './VouchersPage.css'

export function VouchersPage() {
  const { vouchers, claimedVouchers, claimVoucher, user } = useStore()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const claimedCodes = new Set(claimedVouchers.map((v) => v.code))

  async function onClaim(claimCode: string) {
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนเก็บคูปอง')
      return
    }
    try {
      await claimVoucher(claimCode)
      toast('เก็บคูปองแล้ว')
      setCode('')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เก็บคูปองไม่สำเร็จ')
    }
  }

  return (
    <div className="app-frame">
      <PageHeader title="คูปอง" backTo="/account" />
      <main className="vouchers-page">
        <form
          className="voucher-claim"
          onSubmit={(e) => {
            e.preventDefault()
            void onClaim(code.trim().toUpperCase())
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ใส่โค้ดคูปอง"
          />
          <button type="submit">เก็บคูปอง</button>
        </form>

        <h2 className="vouchers-page__section">คูปองของฉัน</h2>
        {claimedVouchers.length === 0 ? (
          <p className="vouchers-page__empty">ยังไม่ได้เก็บคูปอง — กดเก็บจากรายการด้านล่าง</p>
        ) : (
          claimedVouchers.map((voucher) => (
            <article key={`mine-${voucher.code}`} className="voucher-card">
              <div className="voucher-card__value">{formatPrice(voucher.discount)}</div>
              <div className="voucher-card__body">
                <h2>{voucher.title}</h2>
                <p>{voucher.description}</p>
                <p className="voucher-card__meta">
                  โค้ด {voucher.code} · หมดอายุ {voucher.expiresAt}
                  {voucher.scope === 'shop'
                    ? ` · ร้าน${voucher.shopName ? ` ${voucher.shopName}` : ''}`
                    : ''}
                </p>
              </div>
              <span className="voucher-card__owned">
                {voucher.used ? 'ใช้แล้ว' : 'พร้อมใช้'}
              </span>
            </article>
          ))
        )}

        <h2 className="vouchers-page__section">คูปองทั้งหมด</h2>
        {vouchers.map((voucher) => (
          <article key={voucher.code} className="voucher-card">
            <div className="voucher-card__value">{formatPrice(voucher.discount)}</div>
            <div className="voucher-card__body">
              <h2>{voucher.title}</h2>
              <p>{voucher.description}</p>
              <p className="voucher-card__meta">
                โค้ด {voucher.code} · หมดอายุ {voucher.expiresAt}
              </p>
            </div>
            {claimedCodes.has(voucher.code) ? (
              <span className="voucher-card__owned">
                {claimedVouchers.find((c) => c.code === voucher.code)?.used
                  ? 'ใช้แล้ว'
                  : 'เก็บแล้ว'}
              </span>
            ) : (
              <button
                type="button"
                className="voucher-card__claim"
                onClick={() => void onClaim(voucher.code)}
              >
                เก็บ
              </button>
            )}
          </article>
        ))}
      </main>
    </div>
  )
}
