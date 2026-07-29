import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { orderApi } from '../api'
import type { ApiOrder } from '../api/types'
import { ShippingLabelArticle } from '../components/shipping/ShippingLabelArticle'
import { useStore } from '../store/StoreContext'
import './ShippingLabelPage.css'

const FALLBACK_LOGO = '/deeja-logo.png'

export function ShippingLabelPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { shop, user, isAdmin, brand } = useStore()
  const brandName = brand.name || brand.logoText || 'DeeJa'
  const logoSrc = brand.logoUrl?.trim() || FALLBACK_LOGO
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const autoPrint = searchParams.get('print') === '1'

  useEffect(() => {
    let alive = true
    setLoading(true)
    orderApi
      .get(id)
      .then((res) => {
        if (alive) setOrder(res.order)
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'โหลดออเดอร์ไม่สำเร็จ')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (!autoPrint || !order || loading) return
    const t = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(t)
  }, [autoPrint, order, loading])

  const sender = useMemo(() => {
    const name = shop?.name || 'DeeJa Shop'
    const phone = user?.phone || shop?.contactPhone || ''
    const location = shop?.addressLine || shop?.location || ''
    return { name, phone, location }
  }, [shop, user])

  const items = useMemo(() => {
    if (!order) return []
    if (shop && !isAdmin) return order.items.filter((i) => i.shopId === shop.id)
    return order.items
  }, [order, shop, isAdmin])

  if (loading) {
    return (
      <div className="ship-label-page">
        <p className="ship-label-page__msg">กำลังโหลดใบปะหน้า...</p>
      </div>
    )
  }

  if (error || !order) {
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
    <div className="ship-label-page">
      <div className="ship-label-toolbar no-print">
        <button type="button" className="ship-label-toolbar__btn ghost" onClick={() => navigate(-1)}>
          กลับ
        </button>
        <button type="button" className="ship-label-toolbar__btn" onClick={() => window.print()}>
          พิมพ์ใบปะหน้า
        </button>
        <Link className="ship-label-toolbar__btn ghost" to={`/orders/${order.id}`}>
          รายละเอียดออเดอร์
        </Link>
      </div>
      <p className="ship-label-page__hint no-print">
        พิมพ์บนเว็บ DeeJa · มีเส้นแบ่งช่องแบบใบขนส่ง · ไม่ต้องล็อกอิน ZORT
      </p>

      <ShippingLabelArticle
        order={order}
        items={items}
        sender={sender}
        brandName={brandName}
        logoSrc={logoSrc}
      />
    </div>
  )
}
