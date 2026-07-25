import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatPrice } from '../../data/catalog'
import { ImageUpload } from '../../components/ImageUpload'
import { shopApi } from '../../api'
import { useCatalog } from '../../store/CatalogContext'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { ApiProduct, ShopCategory } from '../../api/types'
import './SellerShell.css'

type ListTab = 'all' | 'active' | 'sold_out' | 'hidden' | 'draft'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
  extraImages: '',
  location: '',
  categorySlug: 'fashion',
  shopCategoryId: '',
  badge: '',
  flashSale: false,
  stock: '50',
  variantsText: '',
}

export function SellerProductsPage() {
  const { shop, refreshSession } = useStore()
  const { categories, createProduct, updateProduct, deleteProduct, loadMine } = useCatalog()
  const { toast } = useToast()
  const [items, setItems] = useState<ApiProduct[]>([])
  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([])
  const [form, setForm] = useState(emptyForm)
  const [newShopCat, setNewShopCat] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tab, setTab] = useState<ListTab>('all')
  const [saving, setSaving] = useState(false)

  async function reload() {
    try {
      setItems(await loadMine())
    } catch {
      setItems([])
    }
  }

  async function reloadShopCategories() {
    try {
      const res = await shopApi.listShopCategories()
      setShopCategories(res.categories || [])
    } catch {
      setShopCategories(shop?.shopCategories || [])
    }
  }

  useEffect(() => {
    void reload()
    void reloadShopCategories()
  }, [shop?.id])

  const counts = useMemo(() => {
    const active = items.filter((p) => p.status === 'active' && (p.stock ?? 0) > 0).length
    const soldOut = items.filter((p) => p.status === 'active' && (p.stock ?? 0) <= 0).length
    const hidden = items.filter((p) => p.status === 'hidden').length
    const draft = items.filter((p) => p.status === 'draft').length
    return { all: items.length, active, sold_out: soldOut, hidden, draft }
  }, [items])

  const filtered = useMemo(() => {
    if (tab === 'all') return items
    if (tab === 'active') return items.filter((p) => p.status === 'active' && (p.stock ?? 0) > 0)
    if (tab === 'sold_out') return items.filter((p) => p.status === 'active' && (p.stock ?? 0) <= 0)
    if (tab === 'hidden') return items.filter((p) => p.status === 'hidden')
    if (tab === 'draft') return items.filter((p) => p.status === 'draft')
    return items
  }, [items, tab])

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

  function buildPayload(status: 'active' | 'draft' | 'hidden') {
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
    return {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
      image: images[0],
      images,
      location: form.location.trim() || shop!.location,
      categorySlug: form.categorySlug,
      shopCategoryId: form.shopCategoryId || null,
      badge: form.badge.trim() || undefined,
      flashSale: form.flashSale,
      stock: Number(form.stock) || 0,
      variants,
      status,
    }
  }

  async function save(status: 'active' | 'draft' | 'hidden') {
    if (!form.name.trim() || !form.price || !form.categorySlug) {
      toast('กรอกชื่อ ราคา และหมวดบนแอป')
      return
    }
    setSaving(true)
    try {
      const payload = buildPayload(status)
      if (editingId) {
        await updateProduct(editingId, payload)
        toast(status === 'active' ? 'ลงขายแล้ว' : 'บันทึกแล้ว')
      } else {
        await createProduct(payload)
        toast(status === 'active' ? 'เพิ่มและลงขายแล้ว' : 'บันทึกฉบับร่างแล้ว')
      }
      setForm(emptyForm)
      setEditingId(null)
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    await save('active')
  }

  async function createCategory() {
    const name = newShopCat.trim()
    if (!name) return
    try {
      const res = await shopApi.createShopCategory(name)
      setShopCategories(res.categories)
      setForm((p) => ({ ...p, shopCategoryId: res.category.id }))
      setNewShopCat('')
      await refreshSession()
      toast(`สร้างหมวดในร้าน “${res.category.name}” แล้ว`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'สร้างหมวดไม่สำเร็จ')
    }
  }

  async function removeCategory(id: string) {
    try {
      const res = await shopApi.removeShopCategory(id)
      setShopCategories(res.categories)
      if (form.shopCategoryId === id) setForm((p) => ({ ...p, shopCategoryId: '' }))
      await refreshSession()
      toast('ลบหมวดในร้านแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ลบหมวดไม่สำเร็จ')
    }
  }

  const shopCatName = (id?: string | null) =>
    shopCategories.find((c) => c.id === id)?.name || '-'

  return (
    <div className="seller-page">
      <h1>สินค้าของร้าน</h1>
      <p className="seller-page__sub">
        หมวดในร้านสร้างเองได้ · หมวดบนแอป (ลูกค้าค้นจากหน้าแรก) ยังเป็นของแอดมิน
      </p>

      <div className="seller-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>หมวดหมู่ในร้าน</h2>
        <p className="seller-page__sub" style={{ marginTop: 0 }}>
          ใช้จัดกลุ่มสินค้าในหน้าร้านของคุณ — ไม่ไปโผล่เป็นหมวดหลักของแอป
        </p>
        <div className="seller-actions" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {shopCategories.length === 0 ? (
            <span style={{ color: '#6b7280', fontSize: 13 }}>ยังไม่มีหมวดในร้าน</span>
          ) : (
            shopCategories.map((c) => (
              <span key={c.id} className="seller-chip">
                {c.name}
                <button type="button" onClick={() => void removeCategory(c.id)} aria-label="ลบหมวด">
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <div className="seller-actions">
          <input
            value={newShopCat}
            onChange={(e) => setNewShopCat(e.target.value)}
            placeholder="ชื่อหมวดใหม่ เช่น เสื้อยืด"
            maxLength={40}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button type="button" className="seller-btn" onClick={() => void createCategory()}>
            เพิ่มหมวดในร้าน
          </button>
        </div>
      </div>

      <div className="seller-card">
        <form className="seller-form" onSubmit={onSubmit}>
          <div className="seller-form-grid">
            <label>
              ชื่อสินค้า *{' '}
              <span style={{ color: '#9ca3af', fontWeight: 400 }}>{form.name.length}/120</span>
              <input
                value={form.name}
                maxLength={120}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>
            <label>
              หมวดบนแอป (แพลตฟอร์ม) *
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
              หมวดในร้าน
              <select
                value={form.shopCategoryId}
                onChange={(e) => setForm((p) => ({ ...p, shopCategoryId: e.target.value }))}
              >
                <option value="">— ไม่ระบุ —</option>
                {shopCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              ราคา *
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
              สต็อก *
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
            รายละเอียดสินค้า *{' '}
            <span style={{ color: '#9ca3af', fontWeight: 400 }}>
              {form.description.length}/5000
            </span>
            <textarea
              value={form.description}
              maxLength={5000}
              rows={5}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="รายละเอียดสินค้า วัสดุ ขนาด วิธีใช้..."
              required
            />
          </label>
          <label>
            รูปสินค้าหลัก * (แนะนำ 1:1)
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
            <button
              type="button"
              className="seller-btn ghost"
              disabled={saving}
              onClick={() => void save('draft')}
            >
              บันทึกร่าง
            </button>
            <button className="seller-btn" type="submit" disabled={saving}>
              {editingId ? 'บันทึกและลงขาย' : 'ลงขาย'}
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
        <div className="seller-tabs">
          {(
            [
              ['all', 'ทั้งหมด'],
              ['active', 'ขายอยู่'],
              ['sold_out', 'สินค้าหมด'],
              ['hidden', 'ไม่แสดง'],
              ['draft', 'ฉบับร่าง'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={tab === key ? 'is-active' : undefined}
              onClick={() => setTab(key)}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
        <table className="seller-table">
          <thead>
            <tr>
              <th>รูป</th>
              <th>ชื่อ</th>
              <th>หมวดในร้าน</th>
              <th>ราคา</th>
              <th>สต็อก</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ color: '#6b7280' }}>
                  ไม่มีสินค้าในแท็บนี้
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id}>
                  <td>
                    <img src={product.image} alt="" />
                  </td>
                  <td>{product.name}</td>
                  <td>{shopCatName(product.shopCategoryId)}</td>
                  <td>{formatPrice(product.price)}</td>
                  <td>{product.stock ?? 0}</td>
                  <td>
                    {product.status === 'draft'
                      ? 'ร่าง'
                      : product.status === 'hidden'
                        ? 'ไม่แสดง'
                        : (product.stock ?? 0) <= 0
                          ? 'หมด'
                          : 'ขายอยู่'}
                  </td>
                  <td>
                    <div className="seller-actions">
                      <button
                        type="button"
                        className="seller-btn ghost"
                        onClick={() => {
                          setEditingId(product.id)
                          setForm({
                            name: product.name,
                            description: product.description || '',
                            price: String(product.price),
                            originalPrice: product.originalPrice
                              ? String(product.originalPrice)
                              : '',
                            image: product.image,
                            extraImages: (product.images || []).slice(1).join('\n'),
                            location: product.location,
                            categorySlug: product.categorySlug,
                            shopCategoryId: product.shopCategoryId || '',
                            badge: product.badge ?? '',
                            flashSale: Boolean(product.flashSale),
                            stock: String(product.stock ?? 0),
                            variantsText: (product.variants || [])
                              .map((v) => `${v.name}|${v.sku}|${v.stock}`)
                              .join('\n'),
                          })
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                      >
                        แก้ไข
                      </button>
                      {product.status === 'active' ? (
                        <button
                          type="button"
                          className="seller-btn ghost"
                          onClick={async () => {
                            await updateProduct(product.id, { status: 'hidden' })
                            toast('ซ่อนสินค้าแล้ว')
                            await reload()
                          }}
                        >
                          ซ่อน
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="seller-btn ghost"
                          onClick={async () => {
                            await updateProduct(product.id, { status: 'active' })
                            toast('ลงขายแล้ว')
                            await reload()
                          }}
                        >
                          ลงขาย
                        </button>
                      )}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
