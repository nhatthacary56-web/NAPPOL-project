import { Link } from 'react-router-dom'
import { shopApi } from '../../api'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './SellerShell.css'

export function SellerMePage() {
  const { user, shop, refreshSession, logout } = useStore()
  const { toast } = useToast()

  async function toggleVacation() {
    if (!shop) return
    try {
      const next = !shop.vacationMode
      await shopApi.updateMine({ vacationMode: next })
      await refreshSession()
      toast(next ? 'เปิดโหมดพักร้อนแล้ว — สินค้าถูกซ่อนจากลูกค้า' : 'ปิดโหมดพักร้อนแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  async function shareShop() {
    if (!shop) return
    const url = `${window.location.origin}/shop/${shop.slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: shop.name, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast('คัดลอกลิงก์ร้านแล้ว')
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        toast('คัดลอกลิงก์ร้านแล้ว')
      } catch {
        toast(url)
      }
    }
  }

  return (
    <div className="seller-page seller-me">
      <header className="seller-me__header">
        <div className="seller-home__identity">
          <div className="seller-home__avatar" aria-hidden>
            {(shop?.name || user?.name || 'S').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1>{shop?.name || 'ยังไม่ได้เปิดร้าน'}</h1>
            <p className="seller-page__sub" style={{ margin: 0 }}>
              {user?.email || user?.name}
              {shop ? (
                <>
                  {' · '}
                  <span className={`seller-badge ${shop.status}`}>{shop.status}</span>
                </>
              ) : null}
              {shop?.vacationMode ? <span className="seller-badge vacation">พักร้อน</span> : null}
            </p>
          </div>
        </div>
        {shop?.status === 'active' ? (
          <button type="button" className="seller-btn ghost seller-me__share" onClick={() => void shareShop()}>
            แชร์ร้าน
          </button>
        ) : null}
      </header>

      {shop ? (
        <div className="seller-card seller-me__actions">
          {shop.status === 'active' ? (
            <Link to={`/shop/${shop.slug}`}>
              <span aria-hidden>🏬</span>
              ดูร้านค้า
            </Link>
          ) : (
            <span className="is-disabled">
              <span aria-hidden>🏬</span>
              ดูร้านค้า
            </span>
          )}
          <Link to="/seller/shop">
            <span aria-hidden>🎨</span>
            ตกแต่ง/ตั้งค่าร้าน
          </Link>
        </div>
      ) : (
        <div className="seller-card">
          <Link className="seller-btn" to="/seller">
            ไปเปิดร้าน
          </Link>
        </div>
      )}

      <section className="seller-card seller-menu-list">
        <h2 className="seller-section-title">สถิติร้านค้า</h2>
        <Link to="/seller" className="seller-menu-row">
          <span>ภาพรวมและยอดขาย</span>
          <span aria-hidden>›</span>
        </Link>
        <div className="seller-menu-row is-static">
          <span>สุขภาพบัญชี</span>
          <strong className={shop?.status === 'active' && !shop.vacationMode ? 'is-good' : 'is-warn'}>
            {shop?.status === 'active' ? (shop.vacationMode ? 'พักร้อน' : 'ดี') : shop?.status || '-'}
          </strong>
        </div>
      </section>

      <section className="seller-card seller-menu-list">
        <h2 className="seller-section-title">การเงิน</h2>
        <Link to="/seller/wallet" className="seller-menu-row">
          <span>รายรับของฉัน</span>
          <span aria-hidden>›</span>
        </Link>
        <Link to="/seller/wallet" className="seller-menu-row">
          <span>ยอดคงเหลือ / ถอนเงิน</span>
          <span aria-hidden>›</span>
        </Link>
      </section>

      <section className="seller-card seller-menu-list">
        <h2 className="seller-section-title">ตั้งค่า</h2>
        <Link to="/settings" className="seller-menu-row">
          <span>บัญชีและความปลอดภัย</span>
          <span aria-hidden>›</span>
        </Link>
        <button type="button" className="seller-menu-row" onClick={() => void toggleVacation()} disabled={!shop}>
          <span>
            โหมดพักร้อน
            {shop?.vacationMode ? <em className="seller-badge vacation">เปิดอยู่</em> : null}
          </span>
          <span aria-hidden>{shop?.vacationMode ? 'ปิด' : 'เปิด'} ›</span>
        </button>
        <Link to="/seller/shop" className="seller-menu-row">
          <span>ตั้งค่าร้าน / ที่ตั้ง</span>
          <span aria-hidden>›</span>
        </Link>
        <Link to="/addresses" className="seller-menu-row">
          <span>ที่อยู่จัดส่ง</span>
          <span aria-hidden>›</span>
        </Link>
      </section>

      <section className="seller-card seller-menu-list">
        <h2 className="seller-section-title">ติดต่อและช่วยเหลือ</h2>
        <Link to="/help" className="seller-menu-row">
          <span>ศูนย์การเรียนรู้ / ช่วยเหลือ</span>
          <span aria-hidden>›</span>
        </Link>
        <Link to="/returns-policy" className="seller-menu-row">
          <span>นโยบายคืนสินค้า</span>
          <span aria-hidden>›</span>
        </Link>
      </section>

      <button
        type="button"
        className="seller-logout"
        onClick={() => {
          logout()
          toast('ออกจากระบบแล้ว')
        }}
      >
        ออกจากระบบ
      </button>
    </div>
  )
}
