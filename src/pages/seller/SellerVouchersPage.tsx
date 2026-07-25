import { useEffect, useState, type FormEvent } from 'react'
import { voucherApi } from '../../api'
import type { ApiVoucher } from '../../api/types'
import { formatPrice } from '../../data/catalog'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './SellerShell.css'

const emptyForm = {
  code: '',
  title: '',
  description: '',
  discount: '10',
  minSpend: '500',
  expiresAt: '2026-12-31',
}

export function SellerVouchersPage() {
  const { shop } = useStore()
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState<ApiVoucher[]>([])
  const [form, setForm] = useState(emptyForm)

  async function reload() {
    const res = await voucherApi.shopMine()
    setVouchers(res.vouchers)
  }

  useEffect(() => {
    if (!shop) return
    void reload().catch(() => setVouchers([]))
  }, [shop])

  if (!shop) {
    return (
      <div className="seller-page">
        <h1>คูปองร้าน</h1>
        <p className="seller-page__sub">เปิดร้านก่อนจึงสร้างคูปองได้</p>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await voucherApi.shopCreate({
        code: form.code.trim().toUpperCase(),
        title: form.title.trim() || `ลด ฿${form.discount}`,
        description:
          form.description.trim() ||
          `เมื่อซื้อในร้านครบ ฿${form.minSpend} ลด ฿${form.discount}`,
        discount: Number(form.discount),
        minSpend: Number(form.minSpend),
        expiresAt: form.expiresAt,
        active: true,
      })
      toast('สร้างคูปองร้านแล้ว')
      setForm(emptyForm)
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'สร้างคูปองไม่สำเร็จ')
    }
  }

  return (
    <div className="seller-page">
      <h1>คูปองร้าน</h1>
      <p className="seller-page__sub">
        เช่น ซื้อในร้านครบ ฿500 ลด ฿10 — ลูกค้าเก็บจากหน้าร้าน/สินค้า แล้วใช้ตอนชำระเงิน
        {shop.status !== 'active' ? ' · ร้านต้องอนุมัติก่อนสร้างคูปอง' : null}
      </p>

      <div className="seller-card">
        <form className="seller-form" onSubmit={onSubmit}>
          <div className="seller-form-grid">
            <label>
              โค้ดคูปอง
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="SHOP10"
                required
                disabled={shop.status !== 'active'}
              />
            </label>
            <label>
              ชื่อที่แสดง
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="ลด ฿10 ในร้าน"
                disabled={shop.status !== 'active'}
              />
            </label>
            <label>
              ส่วนลด (บาท)
              <input
                type="number"
                min={1}
                value={form.discount}
                onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
                required
                disabled={shop.status !== 'active'}
              />
            </label>
            <label>
              ยอดขั้นต่ำในร้าน (บาท)
              <input
                type="number"
                min={0}
                value={form.minSpend}
                onChange={(e) => setForm((p) => ({ ...p, minSpend: e.target.value }))}
                required
                disabled={shop.status !== 'active'}
              />
            </label>
            <label>
              หมดอายุ
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                disabled={shop.status !== 'active'}
              />
            </label>
            <label>
              คำอธิบาย
              <input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="เมื่อซื้อในร้านครบ ฿500 ลด ฿10"
                disabled={shop.status !== 'active'}
              />
            </label>
          </div>
          <button className="seller-btn" type="submit" disabled={shop.status !== 'active'}>
            สร้างคูปอง
          </button>
        </form>
      </div>

      <div className="seller-card">
        <h2 className="seller-section-title">คูปองของร้าน</h2>
        {vouchers.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคูปอง</p>
        ) : (
          <table className="seller-table">
            <thead>
              <tr>
                <th>โค้ด</th>
                <th>ส่วนลด</th>
                <th>ขั้นต่ำ</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.code}>
                  <td>
                    <strong>{v.code}</strong>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{v.title}</div>
                  </td>
                  <td>{formatPrice(v.discount)}</td>
                  <td>{formatPrice(v.minSpend)}</td>
                  <td>{v.active ? 'เปิด' : 'ปิด'}</td>
                  <td>
                    <button
                      type="button"
                      className="seller-btn danger"
                      onClick={async () => {
                        try {
                          await voucherApi.shopRemove(v.code)
                          toast('ลบคูปองแล้ว')
                          await reload()
                        } catch (error) {
                          toast(error instanceof Error ? error.message : 'ลบไม่สำเร็จ')
                        }
                      }}
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
