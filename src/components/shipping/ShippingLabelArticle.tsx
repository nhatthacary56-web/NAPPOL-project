import { useEffect, useMemo, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { ApiOrder } from '../../api/types'
import { formatPrice } from '../../data/catalog'

const FALLBACK_LOGO = '/deeja-logo.png'

function formatAddress(order: ApiOrder) {
  const a = order.address
  return [a.line1, a.district, a.province, a.postalCode].filter(Boolean).join(' ')
}

type Sender = { name: string; phone: string; location: string }

type Props = {
  order: ApiOrder
  items: ApiOrder['items']
  sender: Sender
  brandName: string
  logoSrc?: string
  className?: string
}

export function ShippingLabelArticle({
  order,
  items,
  sender,
  brandName,
  logoSrc = FALLBACK_LOGO,
  className,
}: Props) {
  const trackBarcodeRef = useRef<SVGSVGElement | null>(null)
  const orderBarcodeRef = useRef<SVGSVGElement | null>(null)
  const tracking = order.trackingNumber?.trim() || ''
  const orderNo = order.zortOrderNumber || `GA-${order.id}`
  const isCod = order.paymentMethod === 'cod' || order.payment?.status === 'cod'
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items])
  const district = order.address.district || ''

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
      /* ignore */
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
      /* ignore */
    }
  }, [orderNo])

  return (
    <article className={`ship-label ${className || ''}`.trim()} aria-label={`ใบปะหน้า ${order.id}`}>
      <div className="ship-label__row ship-label__row--head">
        <div className="ship-label__cell ship-label__brand-cell">
          <img className="ship-label__logo" src={logoSrc} alt={brandName} />
          <div className="ship-label__brand-text">
            <strong>{brandName}</strong>
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
          <div className="ship-label__cell ship-label__side-box ship-label__side-box--dark">1 OF 1</div>
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
  )
}
