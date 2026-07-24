import { useEffect, useState, type FormEvent } from 'react'
import { formatPrice } from '../../data/catalog'
import { ImageUpload } from '../../components/ImageUpload'
import { useCatalog } from '../../store/CatalogContext'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { ApiProduct } from '../../api/types'
import './SellerShell.css'

const emptyForm = {
  name: '',
  price: '',
  originalPrice: '',
  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
  extraImages: '',
  location: '',
  categorySlug: 'fashion',
  badge: '',
  flashSale: false,
  stock: '50',
  variantsText: '',
}

export function SellerProductsPage() {
  const { shop } = useStore()
  const { categories, createProduct, updateProduct, deleteProduct, loadMine } = useCatalog()
  const { toast } = useToast()
  const [items, setItems] = useState<ApiProduct[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function reload() {
    try {
      setItems(await loadMine())
    } catch {
      setItems([])
    }
  }

  useEffect(() => {
    void reload()
  }, [shop])

  if (!shop) {
    return (
      <div className="seller-page">
        <h1>สินค้า</h1>
        <p className="seller-page__sub">กรุณาเปิดร้านก่อนลงสินค้า</p>
      </div>
    )
  }

  if (shop.status !== 'active') {
    return (
      <div className="seller-page">
        <h1>สินค้า</h1>
        <p className="seller-page__sub">ร้านยังรออนุมัติ — ยังลงสินค้าไม่ได้</p>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const extra = form.extraImages
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean)
    const images = [form.image.trim(), ...extra].filter(Boolean)
    const variants = form.variantsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const [name, sku, stock] = line.split('|').map((s) => s.trim())
        return {
          id: `var_${i + 1}`,
          name: name || `ตัวเลือก ${i + 1}`,
          sku: sku || `SKU-${i + 1}`,
          price: null as number | null,
          stock: Number(stock) || 0,
        }
      })
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      image: images[0],
      images,
      location: form.location.trim() || shop!.location,
      categorySlug: form.categorySlug,
      badge: form.badge.trim() || undefined,
      flashSale: form.flashSale,
      stock: Number(form.stock) || 0,
      variants,
    }
    try {
      if (editingId) {
        await updateProduct(editingId, payload)
        toast('อัปเดตสินค้าแล้ว')
      } else {
        await createProduct(payload)
        toast('เพิ่มสินค้าแล้ว')
      }
      setForm(emptyForm)
      setEditingId(null)
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="seller-page">
      <h1>สินค้าของร้าน</h1>
      <p className="seller-page__sub">ลงสินค้าตัวอย่างเพื่อทดลองระบบ (ยังไม่เปิดขายจริง)</p>

      <div className="seller-card">
        <form className="seller-form" onSubmit={onSubmit}>
          <div className="seller-form-grid">
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
              ราคาเดิม
              <input
                type="number"
                min="1"
                value={form.originalPrice}
                onChange={(e) => setForm((p) => ({ ...p, originalPrice: e.target.value }))}
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
          </div>
          <label>
            รูปสินค้าหลัก
            <ImageUpload
              value={form.image}
              onChange={(url) => setForm((p) => ({ ...p, image: url }))}
            />
          </label>
          <label>
            รูปเพิ่มเติม (1 URL ต่อบรรทัด หรือคั่นด้วยจุลภาค)
            <textarea
              value={form.extraImages}
              onChange={(e) => setForm((p) => ({ ...p, extraImages: e.target.value }))}
              placeholder="https://...&#10;https://..."
            />
          </label>
          <label>
            ตัวเลือกสินค้า / SKU (ชื่อ|SKU|สต็อก ต่อบรรทัด)
            <textarea
              value={form.variantsText}
              onChange={(e) => setForm((p) => ({ ...p, variantsText: e.target.value }))}
              placeholder="สีดำ|SKU-BK|20&#10;สีขาว|SKU-WH|15"
            />
          </label>
          <label>
            ป้าย badge
            <input
              value={form.badge}
              onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
              placeholder="เช่น ถูกสุด"
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
          <div className="seller-actions">
            <button className="seller-btn" type="submit">
              {editingId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'}
            </button>
            {editingId ? (
              <button
                type="button"
                className="seller-btn ghost"
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

      <div className="seller-card">
        <table className="seller-table">
          <thead>
            <tr>
              <th>รูป</th>
              <th>ชื่อ</th>
              <th>ราคา</th>
              <th>สต็อก</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((product) => (
              <tr key={product.id}>
                <td>
                  <img src={product.image} alt="" />
                </td>
                <td>{product.name}</td>
                <td>{formatPrice(product.price)}</td>
                <td>{product.stock ?? 0}</td>
                <td>
                  <div className="seller-actions">
                    <button
                      type="button"
                      className="seller-btn ghost"
                      onClick={() => {
                        setEditingId(product.id)
                        setForm({
                          name: product.name,
                          price: String(product.price),
                          originalPrice: product.originalPrice
                            ? String(product.originalPrice)
                            : '',
                          image: product.image,
                          extraImages: (product.images || []).slice(1).join('\n'),
                          location: product.location,
                          categorySlug: product.categorySlug,
                          badge: product.badge ?? '',
                          flashSale: Boolean(product.flashSale),
                          stock: String(product.stock ?? 0),
                          variantsText: (product.variants || [])
                            .map((v) => `${v.name}|${v.sku}|${v.stock}`)
                            .join('\n'),
                        })
                      }}
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      className="seller-btn danger"
                      onClick={async () => {
                        await deleteProduct(product.id)
                        toast('ลบแล้ว')
                        await reload()
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
