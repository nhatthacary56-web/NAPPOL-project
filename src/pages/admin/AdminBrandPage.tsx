import { useEffect, useState, type FormEvent } from 'react'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminBrandPage() {
  const { brand, updateBrand } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState(brand)

  useEffect(() => {
    setForm(brand)
  }, [brand])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await updateBrand(form)
      toast('บันทึกแบรนด์แล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>ตั้งค่าแบรนด์</h1>
      <p className="admin-page__sub">
        แก้ชื่อแอป สโลแกน สีหลักที่ลูกค้าเห็นทั้งระบบ — อยู่ในกลุ่ม “หน้าแอป”
      </p>
      <div className="admin-card">
        <form className="admin-form" onSubmit={onSubmit}>
          <div className="admin-form-grid">
            <label>
              ชื่อแอป
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label>
              ข้อความโลโก้
              <input
                value={form.logoText}
                onChange={(e) => setForm((p) => ({ ...p, logoText: e.target.value }))}
              />
            </label>
            <label>
              สโลแกน
              <input
                value={form.tagline}
                onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
              />
            </label>
            <label>
              สีหลัก
              <input
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
              />
            </label>
          </div>
          <button type="submit">บันทึกแบรนด์</button>
        </form>
      </div>
    </div>
  )
}
