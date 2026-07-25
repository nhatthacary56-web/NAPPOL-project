import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import JsBarcode from 'jsbarcode'
import { orderApi } from '../api'
import type { ApiOrder } from '../api/types'
import { formatPrice } from '../data/catalog'
import { useStore } from '../store/StoreContext'
import './ShippingLabelPage.css'

function formatAddress(order: ApiOrder) {
  const a = order.address
  return [a.line1, a.district, a.province, a.postalCode].filter(Boolean).join(' ')
}

export function ShippingLabelPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { brand, shop, user, isAdmin } = useStore()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const barcodeRef = useRef<SVGSVGElement | null>(null)
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

  const tracking = order?.trackingNumber?.trim() || ''
  const accent = brand.primaryColor || '#ee4d2d'

  useEffect(() => {
    if (!barcodeRef.current || !tracking) return
    try {
      JsBarcode(barcodeRef.current, tracking, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 14,
        height: 56,
        margin: 0,
        width: 1.6,
        background: '#ffffff',
        lineColor: '#111111',
      })
    } catch {
      // invalid characters for barcode — leave empty
    }
  }, [tracking])

  useEffect(() => {
    if (!autoPrint || !order || loading) return
    const t = window.setTimeout(() => window.print(), 350)
    return () => window.clearTimeout(t)
  }, [autoPrint, order, loading])

  const sender = useMemo(() => {
    const name = shop?.name || 'Great Official Shop'
    const phone = user?.phone || ''
    const location = shop?.location || ''
    return { name, phone, location }
  }, [shop, user])

  const isCod = order?.paymentMethod === 'cod' || order?.payment?.status === 'cod'
  const shopItems = useMemo(() => {
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
    <div className="ship-label-page" style={{ ['--label-accent' as string]: accent }}>
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
        พิมพ์จากเว็บ Great App โดยตรง · ใช้เลขพัสดุจากขนส่งบนบาร์โค้ด ไม่ต้องล็อกอินเว็บ ZORT
      </p>

      <article className="ship-label" aria-label="ใบปะหน้าจัดส่ง">
        <header className="ship-label__head">
          <div className="ship-label__brand">
            <span className="ship-label__mark" aria-hidden>
              <svg viewBox="0 0 48 48" width="40" height="40">
                <rect x="4" y="10" width="40" height="30" rx="8" fill="currentColor" />
                <path
                  d="M16 16c0-5 3.5-9 8-9s8 4 8 9"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <text
                  x="24"
                  y="33"
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="14"
                  fontWeight="700"
                  fontFamily="Segoe UI, sans-serif"
                >
                  {(brand.logoText || 'G').slice(0, 1).toUpperCase()}
                </text>
              </svg>
            </span>
            <div>
              <h1>{brand.logoText || brand.name}</h1>
              <p>{brand.tagline || 'ช้อปง่าย ได้ของดี'}</p>
            </div>
          </div>
          <div className="ship-label__carrier">
            <span className="ship-label__carrier-name">{order.carrier || 'ขนส่ง'}</span>
            <span className="ship-label__pieces">1 OF 1</span>
          </div>
        </header>

        <div className="ship-label__barcode-wrap">
          {tracking ? (
            <svg ref={barcodeRef} className="ship-label__barcode" role="img" aria-label={tracking} />
          ) : (
            <p className="ship-label__no-track">ยังไม่มีเลขพัสดุ — เรียกขนส่งหรือใส่เลขก่อนพิมพ์</p>
          )}
        </div>

        <div className="ship-label__grid">
          <section className="ship-label__block">
            <h2>ผู้ส่ง (FROM)</h2>
            <p className="ship-label__name">{sender.name}</p>
            {sender.phone ? <p>โทร {sender.phone}</p> : null}
            {sender.location ? <p>{sender.location}</p> : null}
          </section>
          <aside className="ship-label__meta">
            <div>
              <span>Order</span>
              <strong>{order.zortOrderNumber || `GA-${order.id}`}</strong>
            </div>
            {isCod ? (
              <div className="ship-label__cod">
                <span>COD</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            ) : (
              <div className="ship-label__paid">
                <span>ชำระแล้ว</span>
                <strong>PAID</strong>
              </div>
            )}
          </aside>
          <section className="ship-label__block ship-label__block--to">
            <h2>ผู้รับ (TO)</h2>
            <p className="ship-label__name">{order.address.name}</p>
            <p>โทร {order.address.phone}</p>
            <p>{formatAddress(order)}</p>
          </section>
        </div>

        <table className="ship-label__items">
          <thead>
            <tr>
              <th>#</th>
              <th>สินค้า</th>
              <th>จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {(shopItems.length ? shopItems : order.items).map((item, index) => (
              <tr key={`${item.productId}-${item.variantId || ''}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  {item.name}
                  {item.variantName ? ` · ${item.variantName}` : ''}
                </td>
                <td>{item.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <footer className="ship-label__foot">
          ขอบคุณที่ไว้วางใจ {brand.name}
        </footer>
      </article>
    </div>
  )
}
