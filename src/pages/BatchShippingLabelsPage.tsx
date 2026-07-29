import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { orderApi } from '../api'
import type { ApiOrder } from '../api/types'
import { ShippingLabelArticle } from '../components/shipping/ShippingLabelArticle'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './ShippingLabelPage.css'

const FALLBACK_LOGO = '/deeja-logo.png'

export function BatchShippingLabelsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { shop, user, isAdmin, brand, refreshOrders } = useStore()
  const { toast } = useToast()
  const brandName = brand.name || brand.logoText || 'DeeJa'
  const logoSrc = brand.logoUrl?.trim() || FALLBACK_LOGO
  const autoPrint = searchParams.get('print') === '1'
  const markPrinted = searchParams.get('mark') !== '0'

  const ids = useMemo(
    () =>
      String(searchParams.get('ids') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [searchParams],
  )

  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const sender = useMemo(() => {
    const name = shop?.name || 'DeeJa Shop'
    const phone = user?.phone || shop?.contactPhone || ''
    const location = shop?.addressLine || shop?.location || ''
    return { name, phone, location }
  }, [shop, user])

  useEffect(() => {
    let alive = true
    if (!ids.length) {
      setError('ไม่ได้ระบุออเดอร์')
      setLoading(false)
      return
    }
    setLoading(true)
    void Promise.allSettled(ids.map((id) => orderApi.get(id)))
      .then((results) => {
        if (!alive) return
        const loaded: ApiOrder[] = []
        for (const result of results) {
          if (result.status === 'fulfilled') loaded.push(result.value.order)
        }
        if (!loaded.length) setError('โหลดออเดอร์ไม่สำเร็จ')
        setOrders(loaded)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [ids])

  useEffect(() => {
    if (!autoPrint || loading || !orders.length) return
    const t = window.setTimeout(() => window.print(), 500)
    return () => window.clearTimeout(t)
  }, [autoPrint, loading, orders.length])

  useEffect(() => {
    if (!markPrinted || loading || !orders.length) return
    const orderIds = orders.map((o) => o.id)
    void orderApi
      .bulkFulfillment({ orderIds, action: 'label_printed' })
      .then(() => refreshOrders())
      .catch(() => {
        /* non-blocking */
      })
  }, [markPrinted, loading, orders, refreshOrders])

  if (loading) {
    return (
      <div className="ship-label-page">
        <p className="ship-label-page__msg">กำลังโหลดใบปะหน้า {ids.length} ใบ...</p>
      </div>
    )
  }

  if (error || !orders.length) {
    return (
      <div className="ship-label-page">
        <p className="ship-label-page__msg">{error || 'ไม่พบออเดอร์'}</p>
        <button type="button" className="ship-label-toolbar__btn" onClick={() => navigate(-1)}>
          กลับ
        </button>
      </div>
    )
  }

  return (
    <div className="ship-label-page ship-label-page--batch">
      <div className="ship-label-toolbar no-print">
        <button type="button" className="ship-label-toolbar__btn ghost" onClick={() => navigate(-1)}>
          กลับ
        </button>
        <button
          type="button"
          className="ship-label-toolbar__btn"
          onClick={() => {
            window.print()
            toast(`พร้อมพิมพ์ ${orders.length} ใบ`)
          }}
        >
          พิมพ์ทั้งหมด ({orders.length})
        </button>
        <Link className="ship-label-toolbar__btn ghost" to="/seller/orders/mass-ship">
          จัดส่งแบบชุด
        </Link>
      </div>
      <p className="ship-label-page__hint no-print">
        พิมพ์ใบปะหน้า {orders.length} ออเดอร์ในครั้งเดียว · แต่ละใบขึ้นหน้าใหม่ตอนพิมพ์
      </p>

      {orders.map((order) => {
        const items =
          shop && !isAdmin ? order.items.filter((i) => i.shopId === shop.id) : order.items
        return (
          <div key={order.id} className="ship-label-batch__sheet">
            <ShippingLabelArticle
              order={order}
              items={items}
              sender={sender}
              brandName={brandName}
              logoSrc={logoSrc}
            />
          </div>
        )
      })}
    </div>
  )
}
