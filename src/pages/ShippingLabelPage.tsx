import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import JsBarcode from 'jsbarcode'
import { orderApi } from '../api'
import type { ApiOrder } from '../api/types'
import { formatPrice } from '../data/catalog'
import { useStore } from '../store/StoreContext'
import './ShippingLabelPage.css'

const BRAND_NAME = 'DeeJa'
const LOGO_SRC = '/deeja-logo.png'

function formatAddress(order: ApiOrder) {
  const a = order.address
  return [a.line1, a.district, a.province, a.postalCode].filter(Boolean).join(' ')
}

export function ShippingLabelPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { shop, user, isAdmin } = useStore()
  const [order, setOrder] = useState<ApiOrder | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const trackBarcodeRef = useRef<SVGSVGElement | null>(null)
  const orderBarcodeRef = useRef<SVGSVGElement | null>(null)
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
  const orderNo = order?.zortOrderNumber || (order ? `GA-${order.id}` : '')

  useEffect(() => {
    if (!trackBarcodeRef.current || !tracking) return
    try {
      JsBarcode(trackBarcodeRef.current, tracking, {
        format: 'CODE128',
        displayValue: true,
        fontSize: 12,
        height: 48,
        margin: 2,
        width: 1.35,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // ignore invalid barcode payload
    }
  }, [tracking])

  useEffect(() => {
    if (!orderBarcodeRef.current || !orderNo) return
    try {
      JsBarcode(orderBarcodeRef.current, orderNo, {
        format: 'CODE128',
        displayValue: false,
        height: 28,
        margin: 0,
        width: 1.1,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // ignore
    }
  }, [orderNo])

  useEffect(() => {
    if (!autoPrint || !order || loading) return
    const t = window.setTimeout(() => window.print(), 400)
    return () => window.clearTimeout(t)
  }, [autoPrint, order, loading])

  const sender = useMemo(() => {
    const name = shop?.name || 'DeeJa Shop'
    const phone = user?.phone || ''
    const location = shop?.location || ''
    return { name, phone, location }
  }, [shop, user])

  const isCod = order?.paymentMethod === 'cod' || order?.payment?.status === 'cod'
  const items = useMemo(() => {
    if (!order) return []
    if (shop && !isAdmin) return order.items.filter((i) => i.shopId === shop.id)
    return order.items
  }, [order, shop, isAdmin])
  const totalQty = items.reduce((sum, item) => sum + item.qty, 0)
  const district = order?.address.district || ''

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

      <article className="ship-label" aria-label="ใบปะหน้าจัดส่ง DeeJa">
        {/* Row 1: brand + tracking barcode */}
        <div className="ship-label__row ship-label__row--head">
          <div className="ship-label__cell ship-label__brand-cell">
            <img className="ship-label__logo" src={LOGO_SRC} alt={BRAND_NAME} />
            <div className="ship-label__brand-text">
              <strong>{BRAND_NAME}</strong>
              <span className="ship-label__carrier">{order.carrier || 'ขนส่ง'}</span>
            </div>
          </div>
          <div className="ship-label__cell ship-label__track-cell">
            {tracking ? (
              <svg ref={trackBarcodeRef} className="ship-label__barcode" role="img" aria-label={tracking} />
            ) : (
              <p className="ship-label__no-track">ยังไม่มีเลขพัสดุ</p>
            )}
          </div>
        </div>

        {/* Row 2: addresses + side boxes */}
        <div className="ship-label__row ship-label__row--mid">
          <div className="ship-label__cell ship-label__addr">
            <div className="ship-label__from">
              <div className="ship-label__kicker">FROM</div>
              <p className="ship-label__name">{sender.name}</p>
              {sender.phone ? <p>โทร {sender.phone}</p> : null}
              {sender.location ? <p>{sender.location}</p> : null}
            </div>
            <div className="ship-label__to">
              <div className="ship-label__kicker">TO</div>
              <p className="ship-label__name">{order.address.name}</p>
              <p>โทร {order.address.phone}</p>
              <p>{formatAddress(order)}</p>
            </div>
          </div>
          <div className="ship-label__side">
            <div className="ship-label__cell ship-label__side-box ship-label__side-box--dark">
              1 OF 1
            </div>
            <div className="ship-label__cell ship-label__side-box ship-label__side-box--big">
              {district ? district.slice(0, 3).toUpperCase() : 'DEST'}
            </div>
            <div
              className={`ship-label__cell ship-label__side-box ${isCod ? 'ship-label__side-box--cod' : ''}`}
            >
              {isCod ? (
                <>
                  <span>เก็บเงินปลายทาง</span>
                  <strong>{formatPrice(order.total)}</strong>
                </>
              ) : (
                <>
                  <span>ชำระแล้ว</span>
                  <strong>PAID</strong>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: order barcode + district */}
        <div className="ship-label__row ship-label__row--order">
          <div className="ship-label__cell ship-label__order-meta">
            <div className="ship-label__kicker">Order No.</div>
            <svg ref={orderBarcodeRef} className="ship-label__order-barcode" role="img" aria-label={orderNo} />
            <p className="ship-label__order-no">{orderNo}</p>
          </div>
          <div className="ship-label__cell ship-label__district">
            <strong>{district || order.address.province}</strong>
            <span>{order.address.postalCode}</span>
          </div>
        </div>

        {/* Row 4: items table */}
        <table className="ship-label__items">
          <thead>
            <tr>
              <th className="col-no">#</th>
              <th>ชื่อสินค้า</th>
              <th>ตัวเลือก</th>
              <th className="col-qty">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.productId}-${item.variantId || ''}-${index}`}>
                <td className="col-no">{index + 1}</td>
                <td>{item.name}</td>
                <td>{item.variantName || '-'}</td>
                <td className="col-qty">{item.qty}</td>
              </tr>
            ))}
            <tr className="ship-label__items-foot">
              <td colSpan={3}>Order No. {order.id}</td>
              <td className="col-qty">รวม {totalQty}</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  )
}
