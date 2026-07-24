import { useEffect, useState, type FormEvent } from 'react'
import { metaApi } from '../../api'
import type { ApiBanner } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const empty = {
  title: '',
  subtitle: '',
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
      if (editingId) {
        await metaApi.updateBanner(editingId, form)
        toast('อัปเดตแบนเนอร์แล้ว')
      } else {
        await metaApi.createBanner(form)
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
        แก้ข้อความ / สีโทน / ลิงก์ของสไลด์โปรโมชันบนหน้าแรกแอป — ไม่ต้องแก้โค้ด
      </p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <form className="admin-form" onSubmit={onSubmit}>
          <div className="admin-form-grid">
            <label>
              หัวข้อ
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
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
              โทนสี
              <select
                value={form.tone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tone: e.target.value as ApiBanner['tone'] }))
                }
              >
                <option value="orange">ส้ม</option>
                <option value="coral">คอรัล</option>
                <option value="amber">เหลืองอำพัน</option>
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
                  <strong>{item.title}</strong>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>
                    {item.subtitle} · {item.tone} · {item.link}
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
                          tone: item.tone,
                          link: item.link || '/mall',
                          active: item.active !== false,
                          sort: item.sort || 1,
                        })
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
