import { useEffect, useState } from 'react'
import { formatPrice } from '../../data/catalog'
import { useCatalog } from '../../store/CatalogContext'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminFlashPage() {
  const { products, updateProduct, refreshProducts } = useCatalog()
  const { toast } = useToast()
  const [endsAt, setEndsAt] = useState('')

  useEffect(() => {
    void refreshProducts()
  }, [refreshProducts])

  const flashItems = products.filter((p) => p.flashSale)

  async function toggle(id: string, on: boolean) {
    try {
      const flashEndsAt = endsAt ? new Date(endsAt).toISOString() : null
      await updateProduct(id, {
        flashSale: on,
        flashEndsAt: on ? flashEndsAt : null,
      })
      toast(on ? 'ใส่ Flash Sale แล้ว' : 'เอาออกจาก Flash Sale แล้ว')
      await refreshProducts()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  async function setDeadline(id: string) {
    try {
      await updateProduct(id, {
        flashEndsAt: endsAt ? new Date(endsAt).toISOString() : null,
      })
      toast('ตั้งเวลาหมดแล้ว')
      await refreshProducts()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>Flash Sale</h1>
      <p className="admin-page__sub">
        เลือกสินค้าขึ้นส่วน Flash บนหน้าแรก และกำหนดเวลาหมดโปร (ถ้ามี)
      </p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <label className="admin-form">
          เวลาหมดโปรเริ่มต้น (ใช้ตอนเปิด Flash)
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </label>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>กำลัง Flash ({flashItems.length})</h2>
        {flashItems.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีสินค้า Flash</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>สินค้า</th>
                <th>ราคา</th>
                <th>หมดโปร</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {flashItems.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{formatPrice(p.price)}</td>
                  <td>
                    {p.flashEndsAt
                      ? new Date(p.flashEndsAt).toLocaleString('th-TH')
                      : 'ไม่กำหนด'}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => void setDeadline(p.id)}
                      >
                        ใช้เวลาด้านบน
                      </button>
                      <button
                        type="button"
                        className="admin-btn danger"
                        onClick={() => void toggle(p.id, false)}
                      >
                        เอาออก
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>สินค้าทั้งหมด</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>สินค้า</th>
              <th>ราคา</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 40).map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{formatPrice(p.price)}</td>
                <td>
                  {p.flashSale ? (
                    <span style={{ color: '#6b7280' }}>อยู่ใน Flash</span>
                  ) : (
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => void toggle(p.id, true)}
                    >
                      ใส่ Flash
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
