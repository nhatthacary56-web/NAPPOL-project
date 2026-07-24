import { useState } from 'react'
import { formatPrice } from '../../data/catalog'
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

export function AdminOrdersPage() {
  const { orders, updateOrderStatus, refreshOrders } = useStore()
  const { toast } = useToast()
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('Kerry Express')

  async function advance(orderId: string, status: OrderStatus) {
    if (status === 'shipping') {
      setShipOrderId(orderId)
      setTrackingNumber('')
      setCarrier('Kerry Express')
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
    } catch (error) {
      toast(error instanceof Error ? error.message : 'จัดส่งไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>คำสั่งซื้อ</h1>
      <p className="admin-page__sub">จัดการออเดอร์ทั้งระบบ · ใส่เลขพัสดุเมื่อจัดส่ง</p>
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
                    </td>
                    <td>
                      <div className="admin-actions">
                        {advanceTo ? (
                          <button type="button" onClick={() => void advance(order.id, advanceTo)}>
                            {advanceTo === 'shipping' ? 'จัดส่ง + เลขพัสดุ' : 'ไปขั้นถัดไป'}
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
            <h2 style={{ margin: 0, fontSize: 18 }}>ใส่เลขพัสดุ</h2>
            <label className="admin-form" style={{ display: 'grid', gap: 4 }}>
              บริษัทขนส่ง
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
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
