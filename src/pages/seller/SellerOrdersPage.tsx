import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatPrice } from '../../data/catalog'
import { metaApi, orderApi } from '../../api'
import { useMassShipEnabled } from '../../hooks/useMassShipEnabled'
import { statusLabel, useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { ApiOrder, OrderStatus } from '../../api/types'
import './SellerShell.css'

const STATUS_FILTERS: Array<{ id: '' | OrderStatus | 'cancelled'; label: string }> = [
  { id: '', label: 'ทั้งหมด' },
  { id: 'to_ship', label: 'ที่ต้องจัดส่ง' },
  { id: 'shipping', label: 'กำลังส่ง' },
  { id: 'to_review', label: 'รอรีวิว' },
  { id: 'completed', label: 'สำเร็จ' },
  { id: 'cancelled', label: 'ยกเลิก/คืนเงิน' },
]

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  to_ship: 'shipping',
  shipping: 'to_review',
  to_review: 'completed',
}

const FALLBACK_CARRIERS = ['Kerry Express', 'Flash Express', 'J&T Express', 'Thai Post', 'SPX']

function fulfillmentLabel(order: ApiOrder) {
  const f = order.fulfillment
  if (f?.pickupScheduledAt) return f.method === 'dropoff' ? 'ไปส่งสาขา' : 'นัดรับแล้ว'
  if (f?.packedAt) return 'แพ็คแล้ว'
  if (f?.labelPrintedAt) return 'พิมพ์แล้ว'
  return null
}

export function SellerOrdersPage() {
  const { orders, updateOrderStatus, refreshOrders } = useStore()
  const { toast } = useToast()
  const { massShipEnabled } = useMassShipEnabled()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = (searchParams.get('status') || '') as '' | OrderStatus | 'cancelled'
  const [shipOrderId, setShipOrderId] = useState<string | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carriers, setCarriers] = useState<string[]>(FALLBACK_CARRIERS)
  const [defaultCarrier, setDefaultCarrier] = useState(FALLBACK_CARRIERS[0])
  const [carrier, setCarrier] = useState(FALLBACK_CARRIERS[0])
  const [zortReady, setZortReady] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filteredOrders = useMemo(() => {
    if (!statusFilter) return orders
    if (statusFilter === 'cancelled') {
      return orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded')
    }
    return orders.filter((o) => o.status === statusFilter)
  }, [orders, statusFilter])

  const printableSelected = useMemo(
    () =>
      filteredOrders.filter(
        (o) =>
          selected.has(o.id) &&
          (o.status === 'to_ship' || o.status === 'shipping' || Boolean(o.trackingNumber)),
      ),
    [filteredOrders, selected],
  )

  const allFilteredSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selected.has(o.id))

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

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(filteredOrders.map((o) => o.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  function printSelected() {
    const ids = printableSelected.map((o) => o.id)
    if (!ids.length) {
      toast('เลือกออเดอร์ที่ต้องจัดส่ง/กำลังส่งก่อน')
      return
    }
    const qs = new URLSearchParams({ ids: ids.join(','), print: '1' })
    window.open(`/orders/labels?${qs.toString()}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="seller-page">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>ออเดอร์ร้าน</h1>
          <p className="seller-page__sub">
            เรียกขนส่งผ่าน ZORT ได้เลขพัสดุ แล้วพิมพ์ใบปะหน้าบน Great App ได้เลย (ไม่ต้องเข้าเว็บขนส่ง)
            {zortReady ? ' · ZORT พร้อมใช้' : ' · ยังไม่ได้ตั้งค่า ZORT'}
          </p>
        </div>
        {massShipEnabled ? (
          <Link className="seller-btn" to="/seller/orders/mass-ship">
            จัดส่งแบบชุด
          </Link>
        ) : null}
      </div>

      <div className="seller-tabs" role="tablist" aria-label="กรองสถานะออเดอร์">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.id || 'all'}
            type="button"
            className={statusFilter === tab.id ? 'is-active' : undefined}
            onClick={() => {
              setSelected(new Set())
              if (!tab.id) setSearchParams({})
              else setSearchParams({ status: tab.id })
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="seller-card">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <button type="button" className="seller-btn ghost" onClick={() => void refreshOrders()}>
            รีเฟรช
          </button>
          <button
            type="button"
            className="seller-btn"
            disabled={!printableSelected.length}
            onClick={printSelected}
          >
            พิมพ์ที่เลือก ({printableSelected.length})
          </button>
        </div>
        {filteredOrders.length === 0 ? (
          <p style={{ color: '#6b7280' }}>
            {orders.length === 0 ? 'ยังไม่มีออเดอร์' : 'ไม่มีออเดอร์ในสถานะนี้'}
          </p>
        ) : (
          <table className="seller-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
                <th>รหัส</th>
                <th>ลูกค้า</th>
                <th>ยอด</th>
                <th>สถานะ / พัสดุ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const advanceTo = nextStatus[order.status]
                const sub = fulfillmentLabel(order)
                return (
                  <tr key={order.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(order.id)}
                        onChange={() => toggleOne(order.id)}
                        aria-label={`เลือก ${order.id}`}
                      />
                    </td>
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
                      {sub ? (
                        <div style={{ color: '#0f766e', fontSize: 12, fontWeight: 700 }}>{sub}</div>
                      ) : null}
                      {order.trackingNumber ? (
                        <div style={{ color: '#6b7280', fontSize: 12 }}>
                          {order.carrier} · {order.trackingNumber}
                        </div>
                      ) : null}
                      {order.trackingNumber ||
                      order.status === 'shipping' ||
                      order.status === 'to_ship' ? (
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
