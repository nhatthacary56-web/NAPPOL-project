import { useEffect, useState, type FormEvent } from 'react'
import type { Brand } from '../../api/types'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const COLOR_PRESETS: Array<{
  name: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
}> = [
  { name: 'ส้ม Shopee', primaryColor: '#ee4d2d', secondaryColor: '#ff7337', accentColor: '#ffb000' },
  { name: 'ชมพู DeeJa', primaryColor: '#e91e8c', secondaryColor: '#ff5cad', accentColor: '#ff8fd0' },
  { name: 'แดง', primaryColor: '#dc2626', secondaryColor: '#f87171', accentColor: '#fbbf24' },
  { name: 'ส้มเข้ม', primaryColor: '#ea580c', secondaryColor: '#fb923c', accentColor: '#facc15' },
  { name: 'เหลือง', primaryColor: '#ca8a04', secondaryColor: '#eab308', accentColor: '#fde047' },
  { name: 'เขียวมะนาว', primaryColor: '#65a30d', secondaryColor: '#84cc16', accentColor: '#bef264' },
  { name: 'เขียว', primaryColor: '#16a34a', secondaryColor: '#4ade80', accentColor: '#a3e635' },
  { name: 'มรกต', primaryColor: '#0f766e', secondaryColor: '#14b8a6', accentColor: '#5eead4' },
  { name: 'ฟ้า', primaryColor: '#0284c7', secondaryColor: '#38bdf8', accentColor: '#7dd3fc' },
  { name: 'น้ำเงิน', primaryColor: '#2563eb', secondaryColor: '#60a5fa', accentColor: '#93c5fd' },
  { name: 'คราม', primaryColor: '#4f46e5', secondaryColor: '#818cf8', accentColor: '#a5b4fc' },
  { name: 'ม่วง', primaryColor: '#7c3aed', secondaryColor: '#a78bfa', accentColor: '#c4b5fd' },
  { name: 'ม่วงเข้ม', primaryColor: '#6d28d9', secondaryColor: '#8b5cf6', accentColor: '#ddd6fe' },
  { name: 'ชมพูหวาน', primaryColor: '#db2777', secondaryColor: '#f472b6', accentColor: '#f9a8d4' },
  { name: 'โรส', primaryColor: '#e11d48', secondaryColor: '#fb7185', accentColor: '#fda4af' },
  { name: 'น้ำตาล', primaryColor: '#92400e', secondaryColor: '#d97706', accentColor: '#fbbf24' },
  { name: 'เทาเข้ม', primaryColor: '#374151', secondaryColor: '#6b7280', accentColor: '#f59e0b' },
  { name: 'ดำทอง', primaryColor: '#111827', secondaryColor: '#4b5563', accentColor: '#f59e0b' },
]

export function AdminBrandPage() {
  const { brand, updateBrand } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState<Brand>({
    ...brand,
    secondaryColor: brand.secondaryColor || '#ff7337',
    accentColor: brand.accentColor || '#ffb000',
  })

  useEffect(() => {
    setForm({
      ...brand,
      secondaryColor: brand.secondaryColor || '#ff7337',
      accentColor: brand.accentColor || '#ffb000',
    })
  }, [brand])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await updateBrand(form)
      toast('บันทึกแบรนด์และสีแอปแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>ตั้งค่าแบรนด์และสีแอป</h1>
      <p className="admin-page__sub">
        เปลี่ยนทีมสีทั้งแอปได้ทันที — เลือกพรีเซ็ตหรือปรับทีละสี (หลัก / ไล่โทน / เน้น)
      </p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>พรีเซ็ตสีครบชุด</h2>
        <div className="admin-color-presets">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="admin-color-preset"
              onClick={() =>
                setForm((p) => ({
                  ...p,
                  primaryColor: preset.primaryColor,
                  secondaryColor: preset.secondaryColor,
                  accentColor: preset.accentColor,
                }))
              }
              title={preset.name}
            >
              <span
                className="admin-color-preset__swatch"
                style={{
                  background: `linear-gradient(135deg, ${preset.primaryColor}, ${preset.secondaryColor})`,
                }}
              />
              <em>{preset.name}</em>
            </button>
          ))}
        </div>
      </div>

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
              <div className="admin-color-row">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                />
                <input
                  value={form.primaryColor}
                  onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                />
              </div>
            </label>
            <label>
              สีรอง (ไล่โทนหัวแอป)
              <div className="admin-color-row">
                <input
                  type="color"
                  value={form.secondaryColor || '#ff7337'}
                  onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                />
                <input
                  value={form.secondaryColor || ''}
                  onChange={(e) => setForm((p) => ({ ...p, secondaryColor: e.target.value }))}
                />
              </div>
            </label>
            <label>
              สีเน้น (badge / จุดเด่น)
              <div className="admin-color-row">
                <input
                  type="color"
                  value={form.accentColor || '#ffb000'}
                  onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                />
                <input
                  value={form.accentColor || ''}
                  onChange={(e) => setForm((p) => ({ ...p, accentColor: e.target.value }))}
                />
              </div>
            </label>
          </div>

          <div
            className="admin-brand-preview"
            style={{
              background: `linear-gradient(90deg, ${form.primaryColor}, ${form.secondaryColor || form.primaryColor})`,
            }}
          >
            <strong>{form.logoText || form.name}</strong>
            <span>{form.tagline}</span>
            <em style={{ background: form.accentColor || '#ffb000' }}>สีเน้น</em>
          </div>

          <button type="submit">บันทึกแบรนด์และสี</button>
        </form>
      </div>
    </div>
  )
}
