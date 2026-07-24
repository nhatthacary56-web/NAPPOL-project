import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { shopApi } from '../../api'
import { formatPrice } from '../../data/catalog'
import { useCatalog } from '../../store/CatalogContext'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { Shop } from '../../api/types'
import './SellerShell.css'

export function SellerDashboardPage() {
  const { user, shop, refreshSession, orders } = useStore()
  const { loadMine } = useCatalog()
  const { toast } = useToast()
  const [myProducts, setMyProducts] = useState(0)
  const [form, setForm] = useState({ name: '', description: '', location: 'กรุงเทพฯ' })
  const [localShop, setLocalShop] = useState<Shop | null>(shop)

  useEffect(() => {
    setLocalShop(shop)
  }, [shop])

  useEffect(() => {
    void loadMine().then((items) => setMyProducts(items.length)).catch(() => setMyProducts(0))
  }, [loadMine, shop])

  async function openShop(event: FormEvent) {
    event.preventDefault()
    try {
      const res = await shopApi.register(form)
      setLocalShop(res.shop)
      await refreshSession()
      toast(
        res.shop.status === 'active'
          ? 'เปิดร้านสำเร็จ'
          : 'ส่งคำขอเปิดร้านแล้ว รอแอดมินอนุมัติ',
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เปิดร้านไม่สำเร็จ')
    }
  }

  if (!localShop) {
    return (
      <div className="seller-page">
        <h1>เปิดร้านบน Great App</h1>
        <p className="seller-page__sub">
สวัสดี {user?.name} — กรอกข้อมูลร้านเพื่อเริ่มลงสินค้า (รอแอดมินอนุมัติ)
        </p>
        <div className="seller-card">
          <form className="seller-form" onSubmit={openShop}>
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
              รายละเอียดร้าน
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </label>
            <button className="seller-btn" type="submit">
              ส่งคำขอเปิดร้าน
            </button>
          </form>
        </div>
      </div>
    )
  }

  const revenue = orders.reduce((s, o) => s + o.total, 0)

  return (
    <div className="seller-page">
      <h1>{localShop.name}</h1>
      <p className="seller-page__sub">
        สถานะร้าน:{' '}
        <span className={`seller-badge ${localShop.status}`}>{localShop.status}</span>
        {localShop.status === 'pending'
          ? ' — รอแอดมินอนุมัติก่อนลงขายได้'
          : null}
      </p>

      <div className="seller-stats">
        <div className="seller-stat">
          <span>สินค้า</span>
          <strong>{myProducts}</strong>
        </div>
        <div className="seller-stat">
          <span>ออเดอร์</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="seller-stat">
          <span>ยอดรวม (ทดลอง)</span>
          <strong>{formatPrice(revenue)}</strong>
        </div>
      </div>

      <div className="seller-card">
        <div className="seller-actions">
          <Link className="seller-btn" to="/seller/products">
            จัดการสินค้า
          </Link>
          <Link className="seller-btn ghost" to="/seller/orders">
            ดูออเดอร์
          </Link>
          {localShop.status === 'active' ? (
            <Link className="seller-btn ghost" to={`/shop/${localShop.slug}`}>
              ดูหน้าร้านสาธารณะ
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
