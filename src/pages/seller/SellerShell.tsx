import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import './SellerShell.css'

const links = [
  { to: '/seller', label: 'ภาพรวม', end: true },
  { to: '/seller/products', label: 'สินค้า' },
  { to: '/seller/orders', label: 'ออเดอร์' },
  { to: '/seller/returns', label: 'คืนสินค้า' },
  { to: '/seller/wallet', label: 'กระเป๋าเงิน' },
  { to: '/chats', label: 'แชท' },
  { to: '/seller/shop', label: 'ร้านค้า' },
]

export function SellerShell() {
  const { user, shop } = useStore()

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
        </div>
        <nav>
          {links.map((link) => (
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
          <NavLink to="/">ดูหน้าร้าน</NavLink>
          <NavLink to="/account">บัญชีของฉัน</NavLink>
        </div>
      </aside>
      <main className="seller-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
