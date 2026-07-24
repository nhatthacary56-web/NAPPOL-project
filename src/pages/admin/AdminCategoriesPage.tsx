import { useEffect, useState, type FormEvent } from 'react'
import { metaApi } from '../../api'
import type { ApiCategory } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const empty = { slug: '', name: '', icon: '🏷️', color: '#ffeaea' }

export function AdminCategoriesPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ApiCategory[]>([])
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    const res = await metaApi.categories()
    setItems(res.categories)
  }

  useEffect(() => {
    void load().catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      if (editingId) {
        await metaApi.updateCategory(editingId, form)
        toast('อัปเดตหมวดแล้ว')
      } else {
        await metaApi.createCategory(form)
        toast('เพิ่มหมวดแล้ว')
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
      <h1>หมวดหมู่สินค้า</h1>
      <p className="admin-page__sub">
        แก้ชื่อ / ไอคอน / สีหมวดที่แสดงบนหน้าแรกและหน้ารายการ — ลูกค้าเห็นทันทีหลังบันทึก
      </p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <form className="admin-form" onSubmit={onSubmit}>
          <div className="admin-form-grid">
            <label>
              ชื่อหมวด
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>
            <label>
              slug (ภาษาอังกฤษ)
              <input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                required
                disabled={Boolean(editingId)}
              />
            </label>
            <label>
              ไอคอน (emoji)
              <input
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
              />
            </label>
            <label>
              สีพื้นหลัง
              <input
                value={form.color}
                onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
              />
            </label>
          </div>
          <div className="admin-actions">
            <button type="submit" className="admin-btn">
              {editingId ? 'บันทึกการแก้' : 'เพิ่มหมวด'}
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
              <th>หมวด</th>
              <th>slug</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      background: item.color,
                      padding: '4px 10px',
                      borderRadius: 999,
                    }}
                  >
                    {item.icon} {item.name}
                  </span>
                </td>
                <td>{item.slug}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-btn ghost"
                      onClick={() => {
                        setEditingId(item.id)
                        setForm({
                          slug: item.slug,
                          name: item.name,
                          icon: item.icon,
                          color: item.color,
                        })
                      }}
                    >
                      แก้
                    </button>
                    <button
                      type="button"
                      className="admin-btn danger"
                      onClick={async () => {
                        try {
                          await metaApi.deleteCategory(item.id)
                          toast('ลบแล้ว')
                          await load()
                        } catch (error) {
                          toast(error instanceof Error ? error.message : 'ลบไม่ได้')
                        }
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
