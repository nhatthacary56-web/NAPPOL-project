import { useEffect, useState } from 'react'
import { formatPrice } from '../../data/catalog'
import { orderApi } from '../../api'
import { statusLabel, useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { OrderStatus } from '../../api/types'
import './SellerShell.css'

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  to_ship: 'shipping',
  shipping: 'to_review',
  to_review: 'completed',
}

const carriers = ['Flash Express', 'Kerry Express', 'J&T Express', 'Thai Post', 'SPX']

export function SellerOrdersPage() {
  const { orders, updateOrderStatus, refreshOrders } = useStore()
  const { toast } = useToast()
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState(carriers[0])
  const [zortReady, setZortReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    void orderApi
      .zortStatus()
      .then((res) => setZortReady(res.configured))
      .catch(() => setZortReady(false))
  }, [])

  async function advance(orderId: string, status: OrderStatus) {
    if (status === 'shipping') {
      setShipOrderId(orderId)
      setTrackingNumber('')
      setCarrier(carriers[0])
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
    try {
      await updateOrderStatus(shipOrderId, 'shipping', { trackingNumber, carrier })
      toast('จัดส่งแล้ว · มีเลขพัสดุ')
      setShipOrderId(null)
      await refreshOrders()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'จัดส่งไม่สำเร็จ')
    }
  }

  async function shipWithZort(orderId: string) {
    setBusyId(orderId)
    try {
      const res = await orderApi.zortShip(orderId, { carrier: carriers[0] })
      toast(res.message || `ZORT: ${res.order.trackingNumber}`)
      await refreshOrders()
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
        อัปเดตสถานะ / เรียกขนส่ง ZORT เพื่อขอเลข Tracking และใบปะหน้า
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
                      {order.shippingLabelUrl ? (
                        <div>
                          <a
                            href={order.shippingLabelUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#ee4d2d', fontSize: 12 }}
                          >
                            เปิดใบปะหน้า
                          </a>
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
