import { useEffect, useState, type FormEvent } from 'react'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import { shopApi } from '../../api'
import './SellerShell.css'

export function SellerShopPage() {
  const { shop, refreshSession } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
  })

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name,
        description: shop.description,
        location: shop.location,
      })
    }
  }, [shop])

  if (!shop) {
    return (
      <div className="seller-page">
        <h1>ร้านค้า</h1>
        <p className="seller-page__sub">ยังไม่มีร้าน — กลับไปเปิดร้านที่หน้าภาพรวม</p>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await shopApi.updateMine(form)
      await refreshSession()
      toast('บันทึกร้านแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="seller-page">
      <h1>ตั้งค่าร้าน</h1>
      <p className="seller-page__sub">
        slug: {shop.slug} · สถานะ{' '}
        <span className={`seller-badge ${shop.status}`}>{shop.status}</span>
      </p>
      <div className="seller-card">
        <form className="seller-form" onSubmit={onSubmit}>
          <label>
            ชื่อร้าน
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </label>
          <label>
            ที่ตั้ง
            <input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </label>
          <label>
            รายละเอียด
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <button className="seller-btn" type="submit">
            บันทึก
          </button>
        </form>
      </div>
    </div>
  )
}
