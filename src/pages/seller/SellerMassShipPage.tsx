import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { orderApi } from '../../api'
import type { ApiOrder } from '../../api/types'
import { formatPrice } from '../../data/catalog'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './SellerShell.css'
import './SellerMassShipPage.css'

const PICKUP_SLOTS = [
  'วันนี้ 09:00–12:00',
  'วันนี้ 13:00–16:00',
  'วันนี้ 16:00–18:00',
  'พรุ่งนี้ 09:00–12:00',
  'พรุ่งนี้ 13:00–16:00',
]

type MainTab = 'to_ship' | 'documents'
type PrintFilter = 'all' | 'not_printed' | 'printed'

function fulfillmentBadge(order: ApiOrder) {
  const f = order.fulfillment
  if (f?.pickupScheduledAt) {
    return f.method === 'dropoff' ? 'ไปส่งสาขา' : 'นัดรับแล้ว'
  }
  if (f?.packedAt) return 'แพ็คแล้ว'
  if (f?.labelPrintedAt) return 'พิมพ์แล้ว'
  return 'ยังไม่ดำเนินการ'
}

export function SellerMassShipPage() {
  const { orders, shop, refreshOrders } = useStore()
  const { toast } = useToast()
  const [mainTab, setMainTab] = useState<MainTab>('to_ship')
  const [printFilter, setPrintFilter] = useState<PrintFilter>('all')
  const [carrierFilter, setCarrierFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pickupSlot, setPickupSlot] = useState(PICKUP_SLOTS[0])
  const [pickupNote, setPickupNote] = useState('')
  const [busy, setBusy] = useState(false)

  const toShipOrders = useMemo(
    () => orders.filter((o) => o.status === 'to_ship'),
    [orders],
  )

  const carriers = useMemo(() => {
    const set = new Set<string>()
    for (const o of toShipOrders) {
      if (o.carrier) set.add(o.carrier)
    }
    return [...set].sort()
  }, [toShipOrders])

  const visibleOrders = useMemo(() => {
    let list = toShipOrders
    if (mainTab === 'documents') {
      list = list.filter((o) => Boolean(o.fulfillment?.labelPrintedAt))
    }
    if (printFilter === 'not_printed') {
      list = list.filter((o) => !o.fulfillment?.labelPrintedAt)
    } else if (printFilter === 'printed') {
      list = list.filter((o) => Boolean(o.fulfillment?.labelPrintedAt))
    }
    if (carrierFilter) {
      list = list.filter((o) => (o.carrier || '') === carrierFilter)
    }
    return list
  }, [toShipOrders, mainTab, printFilter, carrierFilter])

  const selectedOrders = useMemo(
    () => visibleOrders.filter((o) => selected.has(o.id)),
    [visibleOrders, selected],
  )

  const allVisibleSelected =
    visibleOrders.length > 0 && visibleOrders.every((o) => selected.has(o.id))

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(visibleOrders.map((o) => o.id)))
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openBatchPrint(ids: string[]) {
    if (!ids.length) {
      toast('เลือกออเดอร์ก่อนพิมพ์')
      return
    }
    const qs = new URLSearchParams({
      ids: ids.join(','),
      print: '1',
    })
    window.open(`/orders/labels?${qs.toString()}`, '_blank', 'noopener,noreferrer')
  }

  async function runAction(action: 'packed' | 'schedule_pickup' | 'dropoff') {
    const ids = selectedOrders.map((o) => o.id)
    if (!ids.length) {
      toast('เลือกออเดอร์ก่อน')
      return
    }
    setBusy(true)
    try {
      const res = await orderApi.bulkFulfillment({
        orderIds: ids,
        action,
        pickupSlot: action === 'schedule_pickup' ? pickupSlot : undefined,
        pickupNote: pickupNote.trim() || undefined,
      })
      await refreshOrders()
      const skipNote = res.skipped.length ? ` · ข้าม ${res.skipped.length} ใบ` : ''
      if (action === 'packed') toast(`ทำเครื่องหมายแพ็คแล้ว ${res.updated} ใบ${skipNote}`)
      else if (action === 'schedule_pickup') toast(`บันทึกนัดรับ ${res.updated} ใบ${skipNote}`)
      else toast(`บันทึกไปส่งสาขา ${res.updated} ใบ${skipNote}`)
      setSelected(new Set())
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  const pickupAddress =
    [shop?.addressLine, shop?.location].filter(Boolean).join(' · ') ||
    'ยังไม่ได้ตั้งที่อยู่ร้าน — ไปที่ตั้งค่าร้าน'

  return (
    <div className="mass-ship">
      <header className="mass-ship__head">
        <div>
          <h1>จัดส่งแบบชุด</h1>
          <p className="seller-page__sub">
            พิมพ์เอกสารพร้อมกัน → แพ็ค → แล้วค่อยนัดรับ/ไปส่งสาขา (ยังไม่เปลี่ยนเป็นกำลังจัดส่งจนกว่าจะใส่เลขพัสดุ)
          </p>
        </div>
        <Link className="seller-btn ghost" to="/seller/orders">
          ออเดอร์ปกติ
        </Link>
      </header>

      <p className="mass-ship__mobile-hint">แนะนำเปิดหน้านี้บนคอมพิวเตอร์เพื่อเลือกหลายใบและพิมพ์เป็นชุด</p>

      <div className="mass-ship__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'to_ship'}
          className={mainTab === 'to_ship' ? 'is-active' : undefined}
          onClick={() => {
            setMainTab('to_ship')
            setSelected(new Set())
          }}
        >
          ที่ต้องจัดส่ง ({toShipOrders.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === 'documents'}
          className={mainTab === 'documents' ? 'is-active' : undefined}
          onClick={() => {
            setMainTab('documents')
            setSelected(new Set())
          }}
        >
          สร้างเอกสาร (
          {toShipOrders.filter((o) => o.fulfillment?.labelPrintedAt).length})
        </button>
      </div>

      <div className="mass-ship__layout">
        <section className="mass-ship__main">
          <div className="mass-ship__filters">
            {(
              [
                { id: 'all', label: 'ทั้งหมด' },
                { id: 'not_printed', label: 'ยังไม่พิมพ์' },
                { id: 'printed', label: 'พิมพ์แล้ว' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                className={printFilter === f.id ? 'is-active' : undefined}
                onClick={() => setPrintFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value)}
              aria-label="กรองขนส่ง"
            >
              <option value="">ทุกช่องทางขนส่ง</option>
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="mass-ship__toolbar">
            <label className="mass-ship__check-all">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
              เลือกทั้งหมดในหน้านี้ ({selectedOrders.length})
            </label>
            <div className="mass-ship__toolbar-actions">
              <button
                type="button"
                className="seller-btn"
                disabled={!selectedOrders.length}
                onClick={() => openBatchPrint(selectedOrders.map((o) => o.id))}
              >
                พิมพ์ใบปะหน้าที่เลือก
              </button>
              <button
                type="button"
                className="seller-btn ghost"
                disabled={!selectedOrders.length || busy}
                onClick={() => void runAction('packed')}
              >
                ทำเครื่องหมายแพ็คแล้ว
              </button>
            </div>
          </div>

          {visibleOrders.length === 0 ? (
            <div className="mass-ship__empty">
              <p>ไม่มีออเดอร์ในตัวกรองนี้</p>
            </div>
          ) : (
            <div className="seller-card" style={{ overflowX: 'auto' }}>
              <table className="seller-table mass-ship__table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }} />
                    <th>สินค้า</th>
                    <th>หมายเลขคำสั่งซื้อ</th>
                    <th>ผู้ซื้อ</th>
                    <th>ช่องทาง</th>
                    <th>เวลายืนยัน</th>
                    <th>สถานะย่อย</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleOrders.map((order) => {
                    const first = order.items[0]
                    const extra = order.items.length - 1
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
                        <td>
                          <div className="mass-ship__product">
                            {first?.image ? (
                              <img src={first.image} alt="" width={40} height={40} />
                            ) : (
                              <span className="mass-ship__product-ph" />
                            )}
                            <div>
                              <strong>{first?.name || 'สินค้า'}</strong>
                              {extra > 0 ? <em>+{extra} รายการ</em> : null}
                              <span>{formatPrice(order.total)}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Link to={`/orders/${order.id}`}>{order.id}</Link>
                        </td>
                        <td>
                          {order.address.name}
                          <div className="mass-ship__muted">{order.address.phone}</div>
                        </td>
                        <td>{order.carrier || 'ยังไม่ระบุ'}</td>
                        <td>
                          {new Date(order.createdAt).toLocaleString('th-TH', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td>
                          <span
                            className={`mass-ship__badge mass-ship__badge--${
                              order.fulfillment?.pickupScheduledAt
                                ? 'pickup'
                                : order.fulfillment?.labelPrintedAt
                                  ? 'printed'
                                  : 'new'
                            }`}
                          >
                            {fulfillmentBadge(order)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="mass-ship__panel">
          <h2>ทำการนัดรับเป็นชุด</h2>
          <p className="mass-ship__panel-sub">
            เลือกออเดอร์ที่แพ็คเสร็จแล้ว แล้วบันทึกนัดรับหรือไปส่งสาขา (บันทึกในระบบ — ยังไม่เรียก API
            ขนส่งจริง)
          </p>

          <div className="mass-ship__panel-block">
            <strong>ที่อยู่รับพัสดุ</strong>
            <p>{pickupAddress}</p>
            <Link to="/seller/shop">เปลี่ยนที่ตั้งค่าร้าน</Link>
          </div>

          <label className="mass-ship__panel-field">
            ช่วงเวลานัดรับ
            <select value={pickupSlot} onChange={(e) => setPickupSlot(e.target.value)}>
              {PICKUP_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          <label className="mass-ship__panel-field">
            หมายเหตุ
            <input
              value={pickupNote}
              onChange={(e) => setPickupNote(e.target.value)}
              placeholder="เช่น ติดต่อก่อนถึง"
            />
          </label>

          <p className="mass-ship__panel-count">เลือกอยู่ {selectedOrders.length} ออเดอร์</p>

          <button
            type="button"
            className="seller-btn mass-ship__panel-btn"
            disabled={!selectedOrders.length || busy}
            onClick={() => void runAction('schedule_pickup')}
          >
            บันทึกนัดรับคำสั่งซื้อที่เลือก
          </button>

          <div className="mass-ship__panel-divider">หรือ</div>

          <button
            type="button"
            className="seller-btn ghost mass-ship__panel-btn"
            disabled={!selectedOrders.length || busy}
            onClick={() => void runAction('dropoff')}
          >
            ไปส่งสาขาเอง (Drop-off)
          </button>

          <p className="mass-ship__panel-note">
            หลังนัดรับแล้ว ใส่เลขพัสดุที่หน้าออเดอร์เพื่อเปลี่ยนเป็น “กำลังจัดส่ง”
          </p>
        </aside>
      </div>
    </div>
  )
}
