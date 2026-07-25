import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import './SellerShell.css'

const sideLinks = [
  { to: '/seller', label: 'หน้าแรก', end: true },
  { to: '/seller/tools', label: 'เครื่องมือ' },
  { to: '/seller/products', label: 'สินค้า' },
  { to: '/seller/orders', label: 'ออเดอร์' },
  { to: '/seller/vouchers', label: 'คูปองร้าน' },
  { to: '/seller/returns', label: 'คืนสินค้า' },
  { to: '/seller/wallet', label: 'การเงิน' },
  { to: '/chats', label: 'แชท' },
  { to: '/seller/shop', label: 'ตั้งค่าร้าน' },
  { to: '/seller/me', label: 'ฉัน' },
]

const bottomLinks = [
  { to: '/seller', label: 'หน้าแรก', end: true, icon: '🏠' },
  { to: '/seller/tools', label: 'เครื่องมือ', icon: '🧰' },
  { to: '/chats', label: 'แชท', icon: '💬', badge: true },
  { to: '/seller/me', label: 'ฉัน', icon: '👤' },
]

export function SellerShell() {
  const { user, shop, unreadCount } = useStore()

  if (!user) return <Navigate to="/login" replace state={{ from: '/seller' }} />
  if (user.role !== 'seller' && user.role !== 'admin') {
    return <Navigate to="/register?role=seller" replace />
  }

  return (
    <div className="seller-shell">
      <aside className="seller-shell__side">
        <div className="seller-shell__brand">
          <strong>Seller Center</strong>
          <span>{shop?.name ?? 'ยังไม่ได้เปิดร้าน'}</span>
          {shop?.vacationMode ? <em className="seller-shell__vacation">โหมดพักร้อน</em> : null}
        </div>
        <nav>
          {sideLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="seller-shell__foot">
          <NavLink to="/">ดูหน้าร้านลูกค้า</NavLink>
          <NavLink to="/account">บัญชีผู้ซื้อ</NavLink>
        </div>
      </aside>
      <main className="seller-shell__main">
        <Outlet />
      </main>
      <nav className="seller-shell__bottom" aria-label="เมนูหลักผู้ขาย">
        {bottomLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'is-active' : undefined)}
          >
            <span className="seller-shell__bottom-icon" aria-hidden>
              {link.icon}
              {link.badge && unreadCount > 0 ? (
                <em>{unreadCount > 99 ? '99+' : unreadCount}</em>
              ) : null}
            </span>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
