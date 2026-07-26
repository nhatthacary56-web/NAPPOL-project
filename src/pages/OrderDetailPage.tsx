import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { ImageUpload } from '../components/ImageUpload'
import { formatPrice } from '../data/catalog'
import { chatApi, returnApi, reviewApi } from '../api'
import { statusLabel, useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import type { OrderStatus } from '../api/types'
import './OrderDetailPage.css'

const FALLBACK_REASONS = [
  'สินค้าไม่ตรงตามที่สั่ง',
  'สินค้าชำรุด / เสียหาย',
  'ได้รับสินค้าไม่ครบ',
  'คุณภาพไม่เป็นไปตามที่โฆษณา',
  'เปลี่ยนใจ / ไม่ต้องการแล้ว',
  'ร้านส่งช้าเกินกำหนด',
  'อื่นๆ',
]

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    orders,
    updateOrderStatus,
    refreshOrders,
    payOrder,
    user,
  } = useStore()
  const order = orders.find((item) => item.id === id)
  const [reviewProductId, setReviewProductId] = useState('')
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [slipNote, setSlipNote] = useState('')
  const [reviewedIds, setReviewedIds] = useState<string[]>([])
  const [returnOpen, setReturnOpen] = useState(false)
  const [reasons, setReasons] = useState<string[]>(FALLBACK_REASONS)
  const [returnReason, setReturnReason] = useState(FALLBACK_REASONS[0])
  const [returnDetail, setReturnDetail] = useState('')
  const [returnEvidence, setReturnEvidence] = useState(['', ''])
  const [selectedReturnItems, setSelectedReturnItems] = useState<string[]>([])
  const [returnBusy, setReturnBusy] = useState(false)

  useEffect(() => {
    void refreshOrders()
  }, [refreshOrders, id])

  useEffect(() => {
    if (!order) return
    const first = order.items.find((i) => !reviewedIds.includes(i.productId))
    if (first) setReviewProductId(first.productId)
    else if (order.items[0]) setReviewProductId(order.items[0].productId)
  }, [order?.id, reviewedIds.join('|')])

  useEffect(() => {
    if (!order || !user) return
    void Promise.all(
      order.items.map((item) =>
        reviewApi.list(item.productId).then((res) =>
          res.reviews.some((r) => r.orderId === order.id && r.userId === user.id)
            ? item.productId
            : null,
        ),
      ),
    ).then((ids) => setReviewedIds(ids.filter(Boolean) as string[]))
  }, [order?.id, user?.id])

  if (!order) {
    return (
      <div className="app-frame">
        <PageHeader title="รายละเอียดคำสั่งซื้อ" backTo="/orders" />
        <main className="order-detail order-detail--empty">
          <p>ไม่พบคำสั่งซื้อ</p>
          <Link to="/orders">กลับไปรายการ</Link>
        </main>
      </div>
    )
  }

  async function advance(next: OrderStatus, message: string) {
    try {
      await updateOrderStatus(order!.id, next)
      toast(message)
      if (next === 'cancelled') {
        const paid =
          order!.payment?.status === 'paid' || order!.paymentMethod === 'wallet'
        if (paid) {
          toast('คืนเงินเข้ากระเป๋าแล้ว — ดูได้ที่เมนูกระเป๋าเงิน')
        }
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  function openReturnForm() {
    setSelectedReturnItems(order!.items.map((i) => i.productId))
    setReturnReason(reasons[0] || FALLBACK_REASONS[0])
    setReturnDetail('')
    setReturnEvidence(['', ''])
    setReturnOpen(true)
    void returnApi
      .reasons()
      .then((res) => {
        if (res.reasons?.length) {
          setReasons(res.reasons)
          setReturnReason(res.reasons[0])
        }
      })
      .catch(() => {})
  }

  async function submitReturn(event: FormEvent) {
    event.preventDefault()
    if (!selectedReturnItems.length) {
      toast('เลือกสินค้าอย่างน้อย 1 รายการ')
      return
    }
    setReturnBusy(true)
    try {
      await returnApi.create({
        orderId: order!.id,
        reason: returnReason,
        reasonDetail: returnDetail,
        itemProductIds: selectedReturnItems,
        evidenceUrls: returnEvidence.filter(Boolean),
        refundMethod: 'wallet',
      })
      toast('ส่งคำขอคืนสินค้าแล้ว — รอร้าน/แอดมินตรวจ')
      setReturnOpen(false)
      await refreshOrders()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ส่งคำขอไม่สำเร็จ')
    } finally {
      setReturnBusy(false)
    }
  }

  async function onPay() {
    const result = await payOrder(order!.id, {
      method: order!.paymentMethod,
      slipNote: slipNote || undefined,
    })
    toast(result.message)
  }

  async function onReview(event: FormEvent) {
    event.preventDefault()
    try {
      await reviewApi.create({
        orderId: order!.id,
        productId: reviewProductId,
        rating,
        comment,
      })
      toast('ส่งรีวิวแล้ว')
      setComment('')
      setReviewedIds((prev) => [...prev, reviewProductId])
      await refreshOrders()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'รีวิวไม่สำเร็จ')
    }
  }

  async function chatSeller() {
    const current = order
    if (!current) return
    const shopId = current.items[0]?.shopId
    if (!shopId) return
    try {
      const res = await chatApi.open({
        shopId,
        orderId: current.id,
        message: `สอบถามออเดอร์ ${current.id}`,
      })
      navigate(`/chats/${res.chatId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เปิดแชทไม่สำเร็จ')
    }
  }

  return (
    <div className="app-frame">
      <PageHeader title="รายละเอียดคำสั่งซื้อ" backTo="/orders" />
      <main className="order-detail">
        <section className="order-detail__card">
          <p className="order-detail__status">{statusLabel(order.status)}</p>
          <p className="order-detail__id">{order.id}</p>
          <p className="order-detail__date">
            {new Date(order.createdAt).toLocaleString('th-TH')}
          </p>
        </section>

        {order.trackingNumber ? (
          <section className="order-detail__card order-detail__track">
            <h2>ติดตามพัสดุ</h2>
            <p>
              {order.carrier || 'ขนส่ง'} · <strong>{order.trackingNumber}</strong>
            </p>
            <p>
              <Link to={`/orders/${order.id}/label`}>พิมพ์ใบปะหน้าบน Great App</Link>
            </p>
            {order.shippedAt ? (
              <p className="muted">
                จัดส่งเมื่อ {new Date(order.shippedAt).toLocaleString('th-TH')}
              </p>
            ) : null}
          </section>
        ) : null}

        {order.status === 'unpaid' &&
        (order.paymentMethod === 'transfer' || order.payment?.promptPay) ? (
          <section className="order-detail__card order-detail__pay">
            <h2>ชำระเงิน PromptPay / โอนธนาคาร</h2>
            {order.payment?.promptPay ? (
              <>
                <p>โอน PromptPay ไปหมายเลข {order.payment.promptPay.phone}</p>
                <p>
                  ยอด {formatPrice(order.payment.promptPay.amount)} · อ้างอิง{' '}
                  {order.payment.promptPay.ref}
                </p>
              </>
            ) : null}
            {order.payment?.bankAccount ? (
              <p className="muted">
                หรือโอน {order.payment.bankAccount.bank}{' '}
                {order.payment.bankAccount.accountNumber} ชื่อ{' '}
                {order.payment.bankAccount.accountName}
              </p>
            ) : null}
            <div className="order-detail__qr" aria-hidden="true">
              QR
            </div>
            <label className="order-detail__slip">
              หมายเหตุสลิป (ถ้ามี)
              <input
                value={slipNote}
                onChange={(e) => setSlipNote(e.target.value)}
                placeholder="เช่น โอนเมื่อ 20:15"
              />
            </label>
            <button type="button" onClick={() => void onPay()}>
              ยืนยันว่าโอนแล้ว (จำลอง)
            </button>
          </section>
        ) : null}

        {order.status === 'unpaid' && order.paymentMethod === 'card' ? (
          <section className="order-detail__card order-detail__pay">
            <h2>ชำระด้วยบัตร (จำลอง)</h2>
            <p>ยอด {formatPrice(order.total)}</p>
            <button type="button" onClick={() => void onPay()}>
              ชำระเงินจำลอง
            </button>
          </section>
        ) : null}

        {order.payment?.paidAt || order.payment?.history?.length ? (
          <section className="order-detail__card">
            <h2>ประวัติชำระเงิน</h2>
            <p className="muted">
              สถานะ: {order.payment?.status}
              {order.payment?.paidAt
                ? ` · ${new Date(order.payment.paidAt).toLocaleString('th-TH')}`
                : ''}
            </p>
            {order.payment?.note ? <p>{order.payment.note}</p> : null}
            {(order.payment?.history || []).map((h, idx) => (
              <p key={idx} className="muted">
                {new Date(h.at).toLocaleString('th-TH')} · {h.note || h.event}
              </p>
            ))}
          </section>
        ) : null}

        <section className="order-detail__card">
          <h2>ที่อยู่จัดส่ง</h2>
          <p>
            {order.address.name} · {order.address.phone}
          </p>
          <p className="muted">
            {order.address.line1}, {order.address.district}, {order.address.province}{' '}
            {order.address.postalCode}
          </p>
        </section>

        <section className="order-detail__card">
          <h2>สินค้า</h2>
          {order.items.map((item) => (
            <div
              key={`${item.productId}-${item.variantId || ''}-${item.shopId}`}
              className="order-detail__line"
            >
              <img src={item.image} alt={item.name} />
              <div>
                <p>{item.name}</p>
                {item.variantName ? <p className="muted">{item.variantName}</p> : null}
                <span>
                  {formatPrice(item.price)} × {item.qty}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="order-detail__card">
          <div className="row">
            <span>ยอดสินค้า</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="row">
            <span>ค่าส่ง</span>
            <span>{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="row">
            <span>ส่วนลด</span>
            <span>-{formatPrice(order.discount)}</span>
          </div>
          <div className="row total">
            <span>ยอดรวม</span>
            <span className="price">{formatPrice(order.total)}</span>
          </div>
        </section>

        {(order.status === 'to_review' || order.status === 'completed') &&
        user?.id === order.userId ? (
          <section className="order-detail__card">
            <h2>รีวิวสินค้า</h2>
            {order.items.every((item) => reviewedIds.includes(item.productId)) ? (
              <p className="muted">รีวิวครบทุกรายการแล้ว ขอบคุณครับ</p>
            ) : (
              <form className="order-detail__review" onSubmit={onReview}>
                <label>
                  สินค้า
                  <select
                    value={reviewProductId}
                    onChange={(e) => setReviewProductId(e.target.value)}
                  >
                    {order.items
                      .filter((item) => !reviewedIds.includes(item.productId))
                      .map((item) => (
                        <option key={item.productId} value={item.productId}>
                          {item.name}
                          {item.variantName ? ` (${item.variantName})` : ''}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  คะแนน
                  <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} ดาว
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  ความคิดเห็น
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="สินค้าเป็นอย่างไรบ้าง"
                  />
                </label>
                <button type="submit">ส่งรีวิว</button>
              </form>
            )}
          </section>
        ) : null}

        <section className="order-detail__actions">
          {user?.id === order.userId ? (
            <button type="button" className="ghost" onClick={() => void chatSeller()}>
              แชทกับร้าน
            </button>
          ) : null}
          {order.status === 'shipping' && user?.id === order.userId ? (
            <button type="button" onClick={() => void advance('to_review', 'ได้รับสินค้าแล้ว')}>
              ยืนยันได้รับสินค้า
            </button>
          ) : null}
          {['shipping', 'to_review', 'completed'].includes(order.status) &&
          user?.id === order.userId &&
          !order.returnId ? (
            <button type="button" className="ghost" onClick={openReturnForm}>
              ขอคืนสินค้า / คืนเงิน
            </button>
          ) : null}
          {order.returnId ? (
            <Link className="ghost order-detail__link-btn" to="/returns">
              ดูสถานะคำขอคืน
            </Link>
          ) : null}
          {(order.status === 'unpaid' || order.status === 'to_ship') &&
          user?.id === order.userId ? (
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                const paid =
                  order.payment?.status === 'paid' || order.paymentMethod === 'wallet'
                const ok = window.confirm(
                  paid
                    ? 'ยกเลิกออเดอร์นี้? เงินที่จ่ายแล้วจะคืนเข้ากระเป๋าเงินของคุณ'
                    : 'ยืนยันยกเลิกคำสั่งซื้อ?',
                )
                if (!ok) return
                await advance('cancelled', 'ยกเลิกคำสั่งซื้อแล้ว')
                navigate(paid ? '/wallet' : '/orders')
              }}
            >
              ยกเลิกคำสั่งซื้อ
            </button>
          ) : null}
        </section>

        {returnOpen ? (
          <div className="order-return-modal" role="dialog" aria-modal="true">
            <form className="order-return-modal__panel" onSubmit={submitReturn}>
              <h2>ขอคืนสินค้า / คืนเงิน</h2>
              <p>
                เงินคืน (กรณีจ่ายออนไลน์) จะเข้ากระเป๋าเงิน · COD ไม่คืนเข้ากระเป๋า
              </p>
              <label>
                เหตุผล *
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  required
                >
                  {reasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                รายละเอียดเพิ่มเติม
                <textarea
                  value={returnDetail}
                  onChange={(e) => setReturnDetail(e.target.value)}
                  placeholder="อธิบายปัญหา / สิ่งที่ต้องการ"
                  rows={3}
                />
              </label>
              <fieldset className="order-return-modal__items">
                <legend>เลือกสินค้าที่จะคืน</legend>
                {order.items.map((item) => (
                  <label key={item.productId + (item.variantId || '')}>
                    <input
                      type="checkbox"
                      checked={selectedReturnItems.includes(item.productId)}
                      onChange={(e) => {
                        setSelectedReturnItems((prev) =>
                          e.target.checked
                            ? [...new Set([...prev, item.productId])]
                            : prev.filter((id) => id !== item.productId),
                        )
                      }}
                    />
                    <span>
                      {item.name} · {formatPrice(item.price * item.qty)}
                    </span>
                  </label>
                ))}
              </fieldset>
              <label>
                หลักฐานรูป 1 (แนะนำ)
                <ImageUpload
                  value={returnEvidence[0] || ''}
                  onChange={(url) => setReturnEvidence((p) => [url, p[1] || ''])}
                />
              </label>
              <label>
                หลักฐานรูป 2 (ถ้ามี)
                <ImageUpload
                  value={returnEvidence[1] || ''}
                  onChange={(url) => setReturnEvidence((p) => [p[0] || '', url])}
                />
              </label>
              <div className="order-return-modal__actions">
                <button type="button" className="ghost" onClick={() => setReturnOpen(false)}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={returnBusy}>
                  {returnBusy ? 'กำลังส่ง...' : 'ส่งคำขอ'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  )
}
