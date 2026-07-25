import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import './AdminShell.css'

const navGroups = [
  {
    title: 'ภาพรวม',
    hint: 'ดูสถานะแพลตฟอร์ม',
    links: [{ to: '/admin', label: 'แดชบอร์ด', end: true, desc: 'สถิติและงานค้าง' }],
  },
  {
    title: 'ร้านค้าและออเดอร์',
    hint: 'ดูแลผู้ขายและคำสั่งซื้อ',
    links: [
      { to: '/admin/shops', label: 'ร้านค้า', desc: 'อนุมัติ / ระงับร้าน' },
      { to: '/admin/products', label: 'สินค้า', desc: 'จัดการสินค้าทั้งระบบ' },
      { to: '/admin/orders', label: 'คำสั่งซื้อ', desc: 'สถานะจัดส่งและเลขพัสดุ' },
      { to: '/admin/returns', label: 'คืนสินค้า', desc: 'อนุมัติคืนเงิน' },
      { to: '/admin/help', label: 'ศูนย์ช่วยเหลือ', desc: 'ข้อความติดต่อแอดมิน' },
    ],
  },
  {
    title: 'การเงิน',
    hint: 'รายได้แพลตฟอร์มและผู้ขาย',
    links: [
      { to: '/admin/wallet', label: 'กระเป๋าเงิน', desc: 'อนุมัติถอน + PromptPay' },
      { to: '/admin/reports', label: 'รายงานค่าคอม', desc: 'fee / net ต่อออเดอร์' },
      { to: '/admin/vouchers', label: 'คูปอง', desc: 'สร้างโค้ดส่วนลด' },
    ],
  },
  {
    title: 'หน้าแอป (แก้ไขเองได้)',
    hint: 'ทุกอย่างที่ลูกค้าเห็นบนแอป',
    links: [
      {
        to: '/admin/app-content',
        label: 'เนื้อหาแอป',
        desc: 'ทางลัด · Mall · ฟีด · ค่าส่ง · ช่วยเหลือ · ข้อความ',
      },
      { to: '/admin/feed', label: 'ฟีดโพสต์', desc: 'อนุมัติ / ซ่อนโพสต์รูป' },
      { to: '/admin/banners', label: 'แบนเนอร์', desc: 'สไลด์หน้าแรก' },
      { to: '/admin/categories', label: 'หมวดหมู่', desc: 'ไอคอนและชื่อหมวด' },
      { to: '/admin/flash', label: 'Flash Sale', desc: 'ตั้งสินค้าและเวลาหมด' },
      { to: '/admin/brand', label: 'แบรนด์', desc: 'ชื่อ สี สโลแกนแอป' },
    ],
  },
  {
    title: 'สมาชิก',
    hint: 'บัญชีผู้ใช้',
    links: [{ to: '/admin/users', label: 'สมาชิก', desc: 'บทบาท / ระงับบัญชี' }],
  },
]

export function AdminShell() {
  const { isAdmin, adminLogout, brand } = useStore()

  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <div className="admin-shell">
      <aside className="admin-shell__side">
        <div className="admin-shell__brand">
          <strong>{brand.logoText} Admin</strong>
          <span>ศูนย์ควบคุมแพลตฟอร์ม</span>
        </div>
        <nav className="admin-shell__nav">
          {navGroups.map((group) => (
            <div key={group.title} className="admin-nav-group">
              <p className="admin-nav-group__title">{group.title}</p>
              <p className="admin-nav-group__hint">{group.hint}</p>
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={'end' in link ? link.end : undefined}
                  className={({ isActive }) =>
                    `admin-nav-link${isActive ? ' is-active' : ''}`
                  }
                  title={link.desc}
                >
                  <strong>{link.label}</strong>
                  <span>{link.desc}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-shell__foot">
          <NavLink to="/">ดูหน้าร้าน</NavLink>
          <button type="button" onClick={adminLogout}>
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <main className="admin-shell__main">
        <Outlet />
      </main>
    </div>
  )
}
