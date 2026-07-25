import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AccountPage.css'

const orderStatuses = [
  { label: 'ที่ต้องชำระ', icon: '💳', status: 'unpaid' },
  { label: 'ที่ต้องจัดส่ง', icon: '📦', status: 'to_ship' },
  { label: 'ที่ต้องได้รับ', icon: '🚚', status: 'shipping' },
  { label: 'รีวิว', icon: '⭐', status: 'to_review' },
] as const

export function AccountPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, shop, logout, orders, wishlist, claimedVouchers, brand } = useStore()

  const menuItems = [
    { label: 'แชทกับร้าน', to: user ? '/chats' : '/login' },
    { label: `คูปองของฉัน (${claimedVouchers.length})`, to: '/vouchers' },
    { label: `สินค้าที่ถูกใจ (${wishlist.length})`, to: '/wishlist' },
    { label: 'ที่อยู่จัดส่ง', to: user ? '/addresses' : '/login' },
    { label: 'ตั้งค่าบัญชี', to: user ? '/settings' : '/login' },
    { label: 'ศูนย์ความช่วยเหลือ', to: '/help' },
    { label: 'นโยบายความเป็นส่วนตัว', to: '/privacy' },
    { label: 'ข้อกำหนดการใช้งาน', to: '/terms' },
    { label: 'นโยบายคืนสินค้า', to: '/returns-policy' },
    ...(user?.role === 'seller' || user?.role === 'admin'
      ? [{ label: shop ? 'แดชบอร์ดร้านค้า' : 'เปิดร้านขายของ', to: '/seller' }]
      : [{ label: 'สมัครเป็นผู้ขาย', to: '/register?role=seller' }]),
    ...(user?.role === 'admin' ? [{ label: 'หลังบ้านแอดมิน', to: '/admin' }] : []),
  ]

  return (
    <main className="page account-page">
      <header className="account-page__hero">
        <div className="account-page__avatar" aria-hidden="true">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (user?.name ?? brand.logoText).slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <p className="account-page__brand">{brand.logoText}</p>
          {user ? (
            <>
              <h1>{user.name}</h1>
              <p className="account-page__sub">
                {user.email} · {user.coins} เหรียญ · {user.role}
              </p>
            </>
          ) : (
            <>
              <h1>ยินดีต้อนรับ</h1>
              <p className="account-page__sub">
                <Link to="/login">เข้าสู่ระบบ</Link> / <Link to="/register">สมัครสมาชิก</Link>
              </p>
            </>
          )}
        </div>
      </header>

      <section className="section account-page__orders">
        <div className="section-head">
          <h2 className="section-title" style={{ color: 'var(--text)' }}>
            การซื้อของฉัน
          </h2>
          <Link to={user ? '/orders' : '/login'} className="section-link">
            ดูทั้งหมด ›
          </Link>
        </div>
        <div className="account-page__status-row">
          {orderStatuses.map((item) => {
            const count = orders.filter((order) => order.status === item.status).length
            return (
              <button
                key={item.label}
                type="button"
                className="account-page__status"
                onClick={() =>
                  navigate(user ? `/orders?status=${item.status}` : '/login')
                }
              >
                <span>
                  {item.icon}
                  {count > 0 ? <i>{count}</i> : null}
                </span>
                <em>{item.label}</em>
              </button>
            )
          })}
        </div>
      </section>

      <section className="section account-page__menu">
        {menuItems.map((item) => (
          <Link key={item.label} to={item.to} className="account-page__menu-item">
            <span>{item.label}</span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
        {user ? (
          <button
            type="button"
            className="account-page__menu-item account-page__logout"
            onClick={() => {
              logout()
              toast('ออกจากระบบแล้ว')
            }}
          >
            <span>ออกจากระบบ</span>
            <span aria-hidden="true">›</span>
          </button>
        ) : null}
      </section>
    </main>
  )
}
