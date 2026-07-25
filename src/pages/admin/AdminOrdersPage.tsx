import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../data/catalog'
import { metaApi, orderApi } from '../../api'
import { statusLabel, useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { OrderStatus } from '../../api/types'
import './AdminShell.css'

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  unpaid: 'to_ship',
  to_ship: 'shipping',
  shipping: 'to_review',
  to_review: 'completed',
}

const FALLBACK_CARRIERS = ['Kerry Express', 'Flash Express', 'J&T Express', 'Thai Post', 'SPX']

export function AdminOrdersPage() {
  const { orders, updateOrderStatus, refreshOrders } = useStore()
  const { toast } = useToast()
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carriers, setCarriers] = useState<string[]>(FALLBACK_CARRIERS)
  const [defaultCarrier, setDefaultCarrier] = useState('Kerry Express')
  const [carrier, setCarrier] = useState('Kerry Express')
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
    try {
      await updateOrderStatus(shipOrderId, 'shipping', { trackingNumber, carrier })
      toast('จัดส่งแล้ว')
      setShipOrderId(null)
      await refreshOrders()
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
    <div className="admin-page">
      <h1>คำสั่งซื้อ</h1>
      <p className="admin-page__sub">
        เรียกขนส่งผ่าน ZORT ได้เลขพัสดุ แล้วพิมพ์ใบปะหน้าบน Great App (ไม่ต้องล็อกอินเว็บขนส่ง)
        {zortReady ? ' · ZORT พร้อมใช้' : ' · ยังไม่ได้ตั้งค่า ZORT'}
      </p>
      <div className="admin-card">
        <button
          type="button"
          className="admin-btn ghost"
          onClick={() => void refreshOrders()}
          style={{ marginBottom: 12 }}
        >
          รีเฟรช
        </button>
        {orders.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำสั่งซื้อ</p>
        ) : (
          <table className="admin-table">
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
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{order.address.phone}</div>
                    </td>
                    <td>{formatPrice(order.total)}</td>
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
                      <div className="admin-actions">
                        {order.status === 'to_ship' && zortReady ? (
                          <button
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => void shipWithZort(order.id)}
                          >
                            {busyId === order.id ? 'ZORT...' : 'เรียก ZORT'}
                          </button>
                        ) : null}
                        {advanceTo ? (
                          <button type="button" onClick={() => void advance(order.id, advanceTo)}>
                            {advanceTo === 'shipping' ? 'ใส่เลขเอง' : 'ไปขั้นถัดไป'}
                          </button>
                        ) : null}
                        {order.status !== 'cancelled' && order.status !== 'completed' ? (
                          <button
                            type="button"
                            className="danger"
                            onClick={async () => {
                              await updateOrderStatus(order.id, 'cancelled')
                              toast('ยกเลิกแล้ว')
                            }}
                          >
                            ยกเลิก
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.4)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 40,
            padding: 16,
          }}
        >
          <div
            className="admin-card"
            style={{ width: 'min(420px, 100%)', margin: 0, display: 'grid', gap: 10 }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>ใส่เลขพัสดุเอง</h2>
            <label className="admin-form" style={{ display: 'grid', gap: 4 }}>
              บริษัทขนส่ง
              <select value={carrier} onChange={(e) => setCarrier(e.target.value)}>
                {carriers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-form" style={{ display: 'grid', gap: 4 }}>
              เลขพัสดุ
              <input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="TH1234567890"
              />
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="admin-btn ghost" onClick={() => setShipOrderId(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={!trackingNumber.trim()}
                onClick={() => void confirmShip()}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
