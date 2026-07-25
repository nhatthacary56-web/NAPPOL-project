import { useEffect, useState, type FormEvent } from 'react'
import { voucherApi } from '../../api'
import { formatPrice } from '../../data/catalog'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { ApiVoucher } from '../../api/types'
import './AdminShell.css'

const emptyForm = {
  code: '',
  title: '',
  description: '',
  discount: '',
  minSpend: '',
  expiresAt: '2026-12-31',
  active: true,
}

export function AdminVouchersPage() {
  const { upsertVoucher, deleteVoucher, refreshVouchers } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [vouchers, setVouchers] = useState<ApiVoucher[]>([])

  async function reload() {
    const res = await voucherApi.adminAll()
    setVouchers(res.vouchers)
  }

  useEffect(() => {
    void reload().catch(() => setVouchers([]))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const voucher: ApiVoucher = {
      code: form.code.trim().toUpperCase(),
      title: form.title.trim(),
      description: form.description.trim(),
      discount: Number(form.discount),
      minSpend: Number(form.minSpend),
      expiresAt: form.expiresAt,
      active: form.active,
      scope: 'platform',
    }
    try {
      await upsertVoucher(voucher)
      toast('บันทึกคูปองแพลตฟอร์มแล้ว')
      setForm(emptyForm)
      await refreshVouchers()
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>คูปอง</h1>
      <p className="admin-page__sub">
        สร้างคูปองแพลตฟอร์มได้ที่นี่ · คูปองร้านสร้างโดยผู้ขาย (ลบได้จากตารางด้านล่าง)
      </p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <form className="admin-form" onSubmit={onSubmit}>
          <div className="admin-form-grid">
            <label>
              โค้ด
              <input
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                required
              />
            </label>
            <label>
              ชื่อคูปอง
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </label>
            <label>
              ส่วนลด
              <input
                type="number"
                value={form.discount}
                onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
                required
              />
            </label>
            <label>
              ขั้นต่ำ
              <input
                type="number"
                value={form.minSpend}
                onChange={(e) => setForm((p) => ({ ...p, minSpend: e.target.value }))}
                required
              />
            </label>
          </div>
          <button className="admin-btn" type="submit">
            บันทึกคูปองแพลตฟอร์ม
          </button>
        </form>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>โค้ด</th>
              <th>ชื่อ</th>
              <th>ประเภท</th>
              <th>ส่วนลด</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr key={voucher.code}>
                <td>{voucher.code}</td>
                <td>
                  {voucher.title}
                  {voucher.shopName ? (
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{voucher.shopName}</div>
                  ) : null}
                </td>
                <td>{voucher.scope === 'shop' ? 'ร้าน' : 'แพลตฟอร์ม'}</td>
                <td>
                  {formatPrice(voucher.discount)} / ขั้นต่ำ {formatPrice(voucher.minSpend)}
                </td>
                <td>
                  <button
                    type="button"
                    className="admin-btn danger"
                    onClick={async () => {
                      await deleteVoucher(voucher.code)
                      toast('ลบคูปองแล้ว')
                      await reload()
                    }}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
