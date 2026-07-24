import { useEffect, useState, type FormEvent } from 'react'
import { formatPrice } from '../../data/catalog'
import { ImageUpload } from '../../components/ImageUpload'
import { useCatalog } from '../../store/CatalogContext'
import { useToast } from '../../store/ToastContext'
import type { ApiProduct } from '../../api/types'
import './AdminShell.css'

const emptyForm = {
  name: '',
  price: '',
  originalPrice: '',
  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
  location: 'กรุงเทพฯ',
  categorySlug: 'fashion',
  badge: '',
  flashSale: false,
  stock: '100',
}

export function AdminProductsPage() {
  const { products, categories, createProduct, updateProduct, deleteProduct, refreshProducts } =
    useCatalog()
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    void refreshProducts()
  }, [refreshProducts])

  function startEdit(product: ApiProduct) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      image: product.image,
      location: product.location,
      categorySlug: product.categorySlug,
      badge: product.badge ?? '',
      flashSale: Boolean(product.flashSale),
      stock: String(product.stock ?? 0),
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      image: form.image.trim(),
      location: form.location.trim(),
      categorySlug: form.categorySlug,
      badge: form.badge.trim() || undefined,
      flashSale: form.flashSale,
      stock: Number(form.stock) || 0,
    }
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
        toast('อัปเดตสินค้าแล้ว')
      } else {
        await createProduct(payload)
        toast('เพิ่มสินค้าแล้ว')
      }
      setEditingId(null)
      setForm(emptyForm)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>จัดการสินค้า</h1>
      <p className="admin-page__sub">เพิ่ม/แก้ไขสินค้าทั้งระบบ (เชื่อม DB จริง)</p>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <form className="admin-form" onSubmit={onSubmit}>
          <div className="admin-form-grid">
            <label>
              ชื่อสินค้า
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>
            <label>
              หมวดหมู่
              <select
                value={form.categorySlug}
                onChange={(e) => setForm((p) => ({ ...p, categorySlug: e.target.value }))}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ราคา
              <input
                type="number"
                min="1"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                required
              />
            </label>
            <label>
              สต็อก
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                required
              />
            </label>
            <label>
              Badge
              <input
                value={form.badge}
                onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
                placeholder="เช่น Mall, ถูกสุด"
              />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.flashSale}
                onChange={(e) => setForm((p) => ({ ...p, flashSale: e.target.checked }))}
              />
              Flash Sale
            </label>
          </div>
          <label>
            รูปสินค้า
            <ImageUpload
              value={form.image}
              onChange={(url) => setForm((p) => ({ ...p, image: url }))}
            />
          </label>
          <div className="admin-actions">
            <button type="submit">{editingId ? 'บันทึก' : 'เพิ่มสินค้า'}</button>
            {editingId ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditingId(null)
                  setForm(emptyForm)
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
              <th>รูป</th>
              <th>ชื่อ</th>
              <th>ร้าน</th>
              <th>สต็อก</th>
              <th>ราคา</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <img src={product.image} alt="" />
                </td>
                <td>{product.name}</td>
                <td>{product.shopName}</td>
                <td>{product.stock ?? 0}</td>
                <td>{formatPrice(product.price)}</td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="ghost" onClick={() => startEdit(product)}>
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={async () => {
                        await deleteProduct(product.id)
                        toast('ลบแล้ว')
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
