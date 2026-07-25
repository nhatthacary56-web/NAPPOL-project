import { useEffect, useState, type FormEvent } from 'react'
import { metaApi } from '../../api'
import type { ApiBanner } from '../../api/types'
import { ImageUpload } from '../../components/ImageUpload'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const tones: ApiBanner['tone'][] = [
  'orange',
  'coral',
  'amber',
  'pink',
  'red',
  'blue',
  'green',
  'purple',
  'teal',
  'black',
]

const empty = {
  title: '',
  subtitle: '',
  image: '',
  tone: 'orange' as ApiBanner['tone'],
  link: '/mall',
  active: true,
  sort: 1,
}

export function AdminBannersPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ApiBanner[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const res = await metaApi.bannersAll()
    setItems(res.banners)
  }

  useEffect(() => {
    void load().catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      const payload = {
        ...form,
        image: form.image.trim() || null,
      }
      if (editingId) {
        await metaApi.updateBanner(editingId, payload)
        toast('อัปเดตแบนเนอร์แล้ว')
      } else {
        await metaApi.createBanner(payload)
        toast('เพิ่มแบนเนอร์แล้ว')
      }
      setForm(empty)
      setEditingId(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>แบนเนอร์หน้าแรก</h1>
      <p className="admin-page__sub">
        ใส่ได้หลายรูปแบบป้ายโปรโมชัน (เช่น ลดแรงทุกวัน) · อัปโหลดภาพแล้วเรียงลำดับได้ ·
        ถ้าไม่มีรูปจะใช้พื้นหลังโทนสีแทน
      </p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <form className="admin-form" onSubmit={onSubmit}>
          <label>
            รูปแบนเนอร์ (แนะนำแนวนอน ~2.4:1)
            <ImageUpload
              value={form.image}
              onChange={(url) => setForm((p) => ({ ...p, image: url }))}
            />
          </label>
          <div className="admin-form-grid">
            <label>
              หัวข้อบนรูป
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="ลดแรงทุกวัน"
              />
            </label>
            <label>
              คำอธิบายสั้น
              <input
                value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              />
            </label>
            <label>
              โทนสีสำรอง (ตอนไม่มีรูป)
              <select
                value={form.tone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tone: e.target.value as ApiBanner['tone'] }))
                }
              >
                {tones.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ลิงก์เมื่อกด
              <input
                value={form.link}
                onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
              />
            </label>
            <label>
              ลำดับ
              <input
                type="number"
                value={form.sort}
                onChange={(e) => setForm((p) => ({ ...p, sort: Number(e.target.value) }))}
              />
            </label>
            <label>
              แสดงผล
              <select
                value={form.active ? '1' : '0'}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === '1' }))}
              >
                <option value="1">เปิด</option>
                <option value="0">ปิด</option>
              </select>
            </label>
          </div>
          <div className="admin-actions">
            <button type="submit" className="admin-btn">
              {editingId ? 'บันทึก' : 'เพิ่มแบนเนอร์'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(empty)
                }}
              >
                ยกเลิก
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>พรีวิว</th>
              <th>เนื้อหา</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.sort}</td>
                <td>
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      style={{
                        width: 88,
                        height: 40,
                        objectFit: 'cover',
                        borderRadius: 6,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: '#6b7280' }}>ไม่มีรูป · {item.tone}</span>
                  )}
                </td>
                <td>
                  <strong>{item.title}</strong>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                    {item.subtitle} · {item.link}
                  </div>
                </td>
                <td>{item.active === false ? 'ปิด' : 'เปิด'}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-btn ghost"
                      onClick={() => {
                        setEditingId(item.id)
                        setForm({
                          title: item.title,
                          subtitle: item.subtitle,
                          image: item.image || '',
                          tone: item.tone,
                          link: item.link || '/mall',
                          active: item.active !== false,
                          sort: item.sort || 1,
                        })
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }}
                    >
                      แก้
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger"
                      onClick={async () => {
                        await metaApi.deleteBanner(item.id)
                        toast('ลบแล้ว')
                        await load()
                      }}
                    >
                      ลบ
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
