import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { returnApi } from '../api'
import type { ApiReturn } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { useToast } from '../store/ToastContext'
import './BuyerReturnsPage.css'

const statusLabel: Record<ApiReturn['status'], string> = {
  pending: 'รอร้าน/แอดมินตรวจ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
  refunded: 'คืนเงินแล้ว',
}

export function BuyerReturnsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ApiReturn[]>([])

  useEffect(() => {
    void returnApi
      .mine()
      .then((res) => setItems(res.returns))
      .catch((error) => toast(error instanceof Error ? error.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  return (
    <div className="app-frame">
      <PageHeader title="คืนสินค้า / คืนเงิน" backTo="/account" />
      <main className="buyer-returns">
        <p className="buyer-returns__hint">
          ขอคืนได้จากหน้ารายละเอียดออเดอร์หลังสินค้าจัดส่งแล้ว · เงินคืน (ถ้าจ่ายออนไลน์)
          จะเข้า <Link to="/wallet">กระเป๋าเงิน</Link>
        </p>
        {items.length === 0 ? (
          <p className="buyer-returns__empty">ยังไม่มีคำขอคืนสินค้า</p>
        ) : (
          <ul className="buyer-returns__list">
            {items.map((item) => (
              <li key={item.id}>
                <div className="buyer-returns__top">
                  <strong>{item.shopName || 'ร้านค้า'}</strong>
                  <span className={`buyer-returns__badge is-${item.status}`}>
                    {statusLabel[item.status]}
                  </span>
                </div>
                <p>{item.reason}</p>
                {item.reasonDetail ? <p className="buyer-returns__detail">{item.reasonDetail}</p> : null}
                <div className="buyer-returns__meta">
                  <span>{formatPrice(item.amount)}</span>
                  <Link to={`/orders/${item.orderId}`}>ดูออเดอร์</Link>
                </div>
                {item.refundedToWallet ? (
                  <p className="buyer-returns__credit">
                    คืนเข้ากระเป๋า {formatPrice(item.refundedToWallet)}
                  </p>
                ) : null}
                {item.evidenceUrls && item.evidenceUrls.length > 0 ? (
                  <div className="buyer-returns__evidence">
                    {item.evidenceUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
