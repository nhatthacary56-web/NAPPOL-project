import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../data/catalog'
import { metaApi, orderApi } from '../../api'
import { statusLabel, useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { OrderStatus } from '../../api/types'
import './SellerShell.css'

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  to_ship: 'shipping',
  shipping: 'to_review',
  to_review: 'completed',
}

const FALLBACK_CARRIERS = ['Kerry Express', 'Flash Express', 'J&T Express', 'Thai Post', 'SPX']

export function SellerOrdersPage() {
  const { orders, updateOrderStatus, refreshOrders } = useStore()
  const { toast } = useToast()
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carriers, setCarriers] = useState<string[]>(FALLBACK_CARRIERS)
  const [defaultCarrier, setDefaultCarrier] = useState(FALLBACK_CARRIERS[0])
  const [carrier, setCarrier] = useState(FALLBACK_CARRIERS[0])
  const [zortReady, setZortReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    void orderApi
      .zortStatus()
      .then((res) => setZortReady(res.configured))
      .catch(() => setZortReady(false))
    void metaApi
      .storefrontSettings()
      .then((res) => {
        const list =
          res.settings.carriers && res.settings.carriers.length > 0
            ? res.settings.carriers
            : FALLBACK_CARRIERS
        const def = res.settings.defaultCarrier || list[0]
        setCarriers(list)
        setDefaultCarrier(def)
        setCarrier(def)
      })
      .catch(() => {})
  }, [])

  async function advance(orderId: string, status: OrderStatus) {
    if (status === 'shipping') {
      setShipOrderId(orderId)
      setTrackingNumber('')
      setCarrier(defaultCarrier)
      return
    }
    try {
      await updateOrderStatus(orderId, status)
      toast(`อัปเดตเป็น ${statusLabel(status)}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  async function confirmShip() {
    if (!shipOrderId) return
    const id = shipOrderId
    try {
      await updateOrderStatus(id, 'shipping', { trackingNumber, carrier })
      toast('จัดส่งแล้ว · เปิดใบปะหน้าบนเว็บเรา')
      setShipOrderId(null)
      await refreshOrders()
      window.open(`/orders/${id}/label?print=1`, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'จัดส่งไม่สำเร็จ')
    }
  }

  async function shipWithZort(orderId: string) {
    setBusyId(orderId)
    try {
      const res = await orderApi.zortShip(orderId, { carrier: defaultCarrier })
      toast(res.message || `ได้เลขพัสดุ ${res.order.trackingNumber || ''} · เปิดใบปะหน้าบนเว็บเรา`)
      await refreshOrders()
      window.open(`/orders/${orderId}/label?print=1`, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เรียก ZORT ไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="seller-page">
      <h1>ออเดอร์ร้าน</h1>
      <p className="seller-page__sub">
        เรียกขนส่งผ่าน ZORT ได้เลขพัสดุ แล้วพิมพ์ใบปะหน้าบน Great App ได้เลย (ไม่ต้องเข้าเว็บขนส่ง)
        {zortReady ? ' · ZORT พร้อมใช้' : ' · ยังไม่ได้ตั้งค่า ZORT'}
      </p>
      <div className="seller-card">
        <button type="button" className="seller-btn ghost" onClick={() => void refreshOrders()}>
          รีเฟรช
        </button>
        {orders.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีออเดอร์</p>
        ) : (
          <table className="seller-table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>ลูกค้า</th>
                <th>ยอด</th>
                <th>สถานะ / พัสดุ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const advanceTo = nextStatus[order.status]
                return (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>
                      {order.address.name}
                      <div style={{ color: '#6b7280' }}>{order.address.phone}</div>
                    </td>
                    <td>
                      {formatPrice(order.items.reduce((s, i) => s + i.price * i.qty, 0))}
                      {order.status === 'unpaid' ? (
                        <div style={{ color: '#b45309', fontSize: 12 }}>รอลูกค้าชำระ</div>
                      ) : null}
                    </td>
                    <td>
                      {statusLabel(order.status)}
                      {order.trackingNumber ? (
                        <div style={{ color: '#6b7280', fontSize: 12 }}>
                          {order.carrier} · {order.trackingNumber}
                        </div>
                      ) : null}
                      {order.trackingNumber || order.status === 'shipping' || order.status === 'to_ship' ? (
                        <div>
                          <Link
                            to={`/orders/${order.id}/label`}
                            style={{ color: '#ee4d2d', fontSize: 12, fontWeight: 700 }}
                          >
                            พิมพ์ใบปะหน้า
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="seller-actions" style={{ display: 'grid', gap: 6 }}>
                        {order.status === 'to_ship' && zortReady ? (
                          <button
                            type="button"
                            className="seller-btn"
                            disabled={busyId === order.id}
                            onClick={() => void shipWithZort(order.id)}
                          >
                            {busyId === order.id ? 'เรียก ZORT...' : 'เรียกขนส่ง ZORT'}
                          </button>
                        ) : null}
                        {advanceTo ? (
                          <button
                            type="button"
                            className="seller-btn ghost"
                            onClick={() => void advance(order.id, advanceTo)}
                          >
                            {advanceTo === 'shipping' ? 'ใส่เลขพัสดุเอง' : 'ไปขั้นถัดไป'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {shipOrderId ? (
        <div className="seller-modal" role="dialog" aria-modal="true">
          <div className="seller-modal__panel">
            <h2>ใส่เลขพัสดุเอง</h2>
            <p>ออเดอร์ {shipOrderId}</p>
            <label>
              บริษัทขนส่ง
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                {carriers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              เลขติดตามพัสดุ
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="เช่น TH1234567890"
                required
              />
            </label>
            <div className="seller-modal__actions">
              <button type="button" className="seller-btn ghost" onClick={() => setShipOrderId(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="seller-btn"
                disabled={!trackingNumber.trim()}
                onClick={() => void confirmShip()}
              >
                ยืนยันจัดส่ง
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
