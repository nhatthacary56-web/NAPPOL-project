import { Link } from 'react-router-dom'
import './SellerShell.css'

const basicTools = [
  { to: '/seller/products', label: 'เพิ่ม/จัดการสินค้า', icon: '📦', tone: '#dbeafe' },
  { to: '/seller/orders', label: 'คำสั่งซื้อ', icon: '📋', tone: '#ede9fe' },
  { to: '/seller/orders/mass-ship', label: 'จัดส่งแบบชุด', icon: '📦', tone: '#ffedd5' },
  { to: '/seller/returns', label: 'สินค้าส่งคืน', icon: '↩️', tone: '#fce7f3' },
  { to: '/seller/wallet', label: 'รายรับของฉัน', icon: '💰', tone: '#d1fae5' },
  { to: '/seller/vouchers', label: 'คูปองร้าน', icon: '🎟️', tone: '#ffedd5' },
  { to: '/seller/shop', label: 'ตั้งค่าร้าน', icon: '🏪', tone: '#e0e7ff' },
  { to: '/chats', label: 'ข้อความลูกค้า', icon: '💬', tone: '#fef3c7' },
  { to: '/seller/orders?status=to_ship', label: 'ที่ต้องจัดส่ง', icon: '🚚', tone: '#e0f2fe' },
  { to: '/seller', label: 'สถิติร้าน', icon: '📊', tone: '#ecfccb' },
]

const moreTools = [
  { to: '/help', label: 'ศูนย์ช่วยเหลือ', icon: '🎓', tone: '#e0e7ff' },
  { to: '/settings', label: 'บัญชีและความปลอดภัย', icon: '🔐', tone: '#f3f4f6' },
  { to: '/seller/me', label: 'โหมดพักร้อน', icon: '🏖️', tone: '#fee2e2' },
]

export function SellerToolsPage() {
  return (
    <div className="seller-page">
      <h1>เครื่องมือ</h1>
      <p className="seller-page__sub">ทางลัดงานร้านที่ใช้บ่อย — ไม่รวมโฆษณา/ไลฟ์ในรอบนี้</p>

      <section className="seller-card">
        <h2 className="seller-section-title">ฟังก์ชันพื้นฐาน</h2>
        <div className="seller-tools-grid">
          {basicTools.map((item) => (
            <Link key={item.to + item.label} to={item.to} className="seller-tools-grid__item">
              <span style={{ background: item.tone }} aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="seller-card">
        <h2 className="seller-section-title">บัญชีและช่วยเหลือ</h2>
        <div className="seller-tools-grid">
          {moreTools.map((item) => (
            <Link key={item.to + item.label} to={item.to} className="seller-tools-grid__item">
              <span style={{ background: item.tone }} aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
