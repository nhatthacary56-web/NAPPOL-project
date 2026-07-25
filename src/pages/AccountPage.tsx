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

function roleLabel(role?: string) {
  if (role === 'seller') return 'ผู้ขาย'
  if (role === 'admin') return 'แอดมิน'
  return 'สมาชิก'
}

export function AccountPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, shop, logout, orders, wishlist, claimedVouchers, brand } = useStore()

  const menuGroups = [
    {
      title: 'บัญชีของฉัน',
      items: [
        { label: 'แชทกับร้าน', to: user ? '/chats' : '/login' },
        { label: `คูปองของฉัน (${claimedVouchers.length})`, to: '/vouchers' },
        { label: `สินค้าที่ถูกใจ (${wishlist.length})`, to: '/wishlist' },
        { label: 'ที่อยู่จัดส่ง', to: user ? '/addresses' : '/login' },
      ],
    },
    {
      title: 'บริการ',
      items: [
        { label: 'ศูนย์ความช่วยเหลือ', to: '/help' },
        ...(user?.role === 'seller' || user?.role === 'admin'
          ? [{ label: shop ? 'แดชบอร์ดร้านค้า' : 'เปิดร้านขายของ', to: '/seller' }]
          : [{ label: 'สมัครเป็นผู้ขาย', to: '/register?role=seller' }]),
        ...(user?.role === 'admin' ? [{ label: 'หลังบ้านแอดมิน', to: '/admin' }] : []),
      ],
    },
    {
      title: 'เกี่ยวกับ',
      items: [
        { label: 'นโยบายความเป็นส่วนตัว', to: '/privacy' },
        { label: 'ข้อกำหนดการใช้งาน', to: '/terms' },
        { label: 'นโยบายคืนสินค้า', to: '/returns-policy' },
      ],
    },
  ]

  return (
    <main className="page account-page">
      <header className="account-page__hero">
        <div className="account-page__hero-top">
          <p className="account-page__brand">{brand.logoText}</p>
          <Link
            to={user ? '/settings' : '/login'}
            className="account-page__gear"
            aria-label="ตั้งค่าบัญชี"
            title="ตั้งค่า"
          >
            <GearIcon />
          </Link>
        </div>
        <div className="account-page__hero-main">
          <div className="account-page__avatar" aria-hidden="true">
            {(user?.name ?? brand.logoText).slice(0, 1).toUpperCase()}
          </div>
          <div className="account-page__identity">
            {user ? (
              <>
                <h1>{user.name}</h1>
                <p className="account-page__sub">
                  {user.email}
                  {user.phone ? ` · ${user.phone}` : ''}
                </p>
                <p className="account-page__meta">
                  {user.coins} เหรียญ · {roleLabel(user.role)}
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

      <section className="account-page__quick">
        <Link to={user ? '/settings' : '/login'} className="account-page__quick-item">
          <span>ตั้งค่าบัญชี</span>
          <em>โปรไฟล์ · เชื่อม LINE/Google</em>
        </Link>
        <Link to={user ? '/addresses' : '/login'} className="account-page__quick-item">
          <span>ที่อยู่</span>
          <em>ที่อยู่จัดส่งของฉัน</em>
        </Link>
      </section>

      {menuGroups.map((group) => (
        <section key={group.title} className="section account-page__menu">
          <h2 className="account-page__menu-title">{group.title}</h2>
          {group.items.map((item) => (
            <Link key={item.label} to={item.to} className="account-page__menu-item">
              <span>{item.label}</span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </section>
      ))}

      {user ? (
        <section className="section account-page__menu">
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
        </section>
      ) : null}
    </main>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  )
}
