import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { statusLabel, useStore } from '../store/StoreContext'
import type { OrderStatus } from '../api/types'
import './OrdersPage.css'

const tabs: Array<{ key: OrderStatus | 'all'; label: string }> = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'unpaid', label: 'ที่ต้องชำระ' },
  { key: 'to_ship', label: 'ที่ต้องจัดส่ง' },
  { key: 'shipping', label: 'ที่ต้องได้รับ' },
  { key: 'to_review', label: 'รีวิว' },
  { key: 'completed', label: 'สำเร็จ' },
]

export function OrdersPage() {
  const { orders, refreshOrders, user } = useStore()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as OrderStatus | 'all' | null) ?? 'all'

  useEffect(() => {
    void refreshOrders()
  }, [refreshOrders, user?.id])

  const filtered =
    status === 'all' ? orders : orders.filter((order) => order.status === status)

  return (
    <div className="app-frame">
      <PageHeader title="คำสั่งซื้อของฉัน" backTo="/account" />
      <div className="orders-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={status === tab.key ? 'is-active' : undefined}
            onClick={() =>
              setParams(tab.key === 'all' ? {} : { status: tab.key })
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <main className="orders-page">
        {filtered.length === 0 ? (
          <div className="orders-page__empty">
            <p>ยังไม่มีคำสั่งซื้อในหมวดนี้</p>
            <Link to="/">ไปช้อปต่อ</Link>
          </div>
        ) : (
          filtered.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="order-card">
              <div className="order-card__head">
                <span>{order.id}</span>
                <em>{statusLabel(order.status)}</em>
              </div>
              <div className="order-card__items">
                {order.items.slice(0, 3).map((item) => (
                  <img key={`${item.productId}-${item.shopId}`} src={item.image} alt={item.name} />
                ))}
              </div>
              <div className="order-card__foot">
                <span>{order.items.reduce((n, i) => n + i.qty, 0)} ชิ้น</span>
                <span className="price">{formatPrice(order.total)}</span>
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  )
}
