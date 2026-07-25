import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { returnApi, shopApi } from '../../api'
import { defaultAppContent } from '../../data/appContent'
import { formatPrice } from '../../data/catalog'
import { useCatalog } from '../../store/CatalogContext'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { Shop } from '../../api/types'
import './SellerShell.css'

export function SellerDashboardPage() {
  const { user, shop, refreshSession, orders, unreadCount } = useStore()
  const { loadMine, appContent } = useCatalog()
  const { toast } = useToast()
  const [myProducts, setMyProducts] = useState(0)
  const [pendingReturns, setPendingReturns] = useState(0)
  const [form, setForm] = useState({ name: '', description: '', location: 'กรุงเทพฯ' })
  const [localShop, setLocalShop] = useState<Shop | null>(shop)

  const sellerCopy = {
    ...defaultAppContent.seller,
    ...appContent.seller,
  }

  useEffect(() => {
    setLocalShop(shop)
  }, [shop])

  useEffect(() => {
    void loadMine().then((items) => setMyProducts(items.length)).catch(() => setMyProducts(0))
  }, [loadMine, shop])

  useEffect(() => {
    if (!shop) {
      setPendingReturns(0)
      return
    }
    void returnApi
      .seller()
      .then((res) => {
        setPendingReturns(res.returns.filter((r) => r.status === 'pending').length)
      })
      .catch(() => setPendingReturns(0))
  }, [shop, orders.length])

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

  const kpis = useMemo(() => {
    const toShip = orders.filter((o) => o.status === 'to_ship').length
    const cancelled = orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded').length
    const toReview = orders.filter((o) => o.status === 'to_review').length
    const revenue = orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'unpaid')
      .reduce((s, o) => s + o.total, 0)
    return { toShip, cancelled, toReview, revenue }
  }, [orders])

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

  return (
    <div className="seller-page seller-home">
      <header className="seller-home__header">
        <div className="seller-home__identity">
          <div className="seller-home__avatar" aria-hidden>
            {localShop.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1>{localShop.name}</h1>
            <p className="seller-page__sub" style={{ margin: 0 }}>
              สถานะ{' '}
              <span className={`seller-badge ${localShop.status}`}>{localShop.status}</span>
              {localShop.vacationMode ? (
                <span className="seller-badge vacation">โหมดพักร้อน</span>
              ) : null}
            </p>
          </div>
        </div>
        <Link className="seller-home__notify" to="/chats" aria-label="แชท">
          <span aria-hidden>💬</span>
          {unreadCount > 0 ? (
            <em>{unreadCount > 99 ? '99+' : unreadCount}</em>
          ) : null}
        </Link>
      </header>

      {sellerCopy.announcement ? (
        <div className="seller-announce" role="status">
          <span aria-hidden>📢</span>
          <p>{sellerCopy.announcement}</p>
        </div>
      ) : null}

      {localShop.status === 'pending' ? (
        <p className="seller-page__sub">รอแอดมินอนุมัติก่อนลงขายได้</p>
      ) : null}

      <div className="seller-kpi">
        <Link className="seller-kpi__item" to="/seller/orders?status=to_ship">
          <strong className={kpis.toShip > 0 ? 'is-urgent' : undefined}>{kpis.toShip}</strong>
          <span>ที่ต้องจัดส่ง</span>
        </Link>
        <Link className="seller-kpi__item" to="/seller/orders?status=cancelled">
          <strong>{kpis.cancelled}</strong>
          <span>ยกเลิก/คืนเงิน</span>
        </Link>
        <Link className="seller-kpi__item" to="/seller/returns">
          <strong className={pendingReturns > 0 ? 'is-urgent' : undefined}>{pendingReturns}</strong>
          <span>คืนสินค้า</span>
        </Link>
        <Link className="seller-kpi__item" to="/seller/orders?status=to_review">
          <strong>{kpis.toReview}</strong>
          <span>รอรีวิว</span>
        </Link>
      </div>

      <div className="seller-card seller-home__snapshot">
        <div>
          <span>สินค้าในร้าน</span>
          <strong>{myProducts}</strong>
        </div>
        <div>
          <span>ออเดอร์ทั้งหมด</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>ยอดขาย (ไม่รวมยกเลิก)</span>
          <strong>{formatPrice(kpis.revenue)}</strong>
        </div>
      </div>

      <section className="seller-card">
        <h2 className="seller-section-title">ทางลัด</h2>
        <div className="seller-quick">
          <Link to="/seller/products" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#dbeafe' }}>
              📦
            </span>
            สินค้าของฉัน
          </Link>
          <Link to="/seller/orders" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#fce7f3' }}>
              📋
            </span>
            ออเดอร์
          </Link>
          <Link to="/seller/wallet" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#d1fae5' }}>
              💳
            </span>
            การเงิน
          </Link>
          <Link to="/seller/tools" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#ffedd5' }}>
              🧰
            </span>
            เครื่องมือ
          </Link>
          <Link to="/seller/shop" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#e0e7ff' }}>
              🏪
            </span>
            ตั้งค่าร้าน
          </Link>
          <Link to="/chats" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#fef3c7' }}>
              💬
            </span>
            แชท
          </Link>
        </div>
      </section>

      {sellerCopy.tipBody ? (
        <section className="seller-card seller-tip">
          <h2 className="seller-section-title">{sellerCopy.tipTitle || 'คำแนะนำ'}</h2>
          <p>{sellerCopy.tipBody}</p>
          <div className="seller-actions">
            <Link className="seller-btn ghost" to="/seller/me">
              ไปที่ฉัน
            </Link>
            {localShop.status === 'active' ? (
              <Link className="seller-btn" to={`/shop/${localShop.slug}`}>
                ดูหน้าร้าน
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
