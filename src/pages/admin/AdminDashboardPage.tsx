import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../data/catalog'
import { metaApi } from '../../api'
import { statusLabel, useStore } from '../../store/StoreContext'
import './AdminShell.css'

export function AdminDashboardPage() {
  const { orders, brand } = useStore()
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    users: 0,
    shops: 0,
    pendingShops: 0,
    pendingReturns: 0,
    openHelpTickets: 0,
    revenue: 0,
    platformFee: 0,
  })

  useEffect(() => {
    void metaApi.stats().then((res) => setStats(res.stats)).catch(() => {})
  }, [orders])

  return (
    <div className="admin-page">
      <h1>แดชบอร์ด</h1>
      <p className="admin-page__sub">
        ภาพรวม {brand.name} — ใช้เมนูซ้ายตามกลุ่มงาน (ร้านค้า · การเงิน · หน้าแอป)
      </p>

      <div className="admin-guide">
        <Link to="/admin/app-content">
          <strong>แก้เนื้อหาแอป</strong>
          <span>ทางลัด · Mall · ฟีด · ค่าส่ง · ข้อความลูกเล่น</span>
        </Link>
        <Link to="/admin/banners">
          <strong>แก้หน้าแอป</strong>
          <span>แบนเนอร์ / หมวด / Flash / แบรนด์</span>
        </Link>
        <Link to="/admin/shops">
          <strong>อนุมัติร้านค้า</strong>
          <span>รออนุมัติ {stats.pendingShops} ร้าน · คืนสินค้าค้าง {stats.pendingReturns} · ช่วยเหลือค้าง {stats.openHelpTickets ?? 0}</span>
        </Link>
      </div>

      <div className="admin-stats">
        <div className="admin-stat">
          <span>สินค้า</span>
          <strong>{stats.products}</strong>
        </div>
        <div className="admin-stat">
          <span>คำสั่งซื้อ</span>
          <strong>{stats.orders}</strong>
        </div>
        <div className="admin-stat">
          <span>สมาชิก</span>
          <strong>{stats.users}</strong>
        </div>
        <div className="admin-stat">
          <span>ยอดขาย</span>
          <strong>{formatPrice(stats.revenue)}</strong>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>งานที่ต้องทำ</h2>
        <p style={{ margin: '0 0 8px', color: '#6b7280', fontSize: 14 }}>
          ร้านรออนุมัติ {stats.pendingShops} · คืนสินค้ารอตรวจ {stats.pendingReturns} ·
          ช่วยเหลือรอตอบ {stats.openHelpTickets ?? 0}
        </p>
        <div className="admin-actions">
          <Link to="/admin/shops" style={{ color: '#ee4d2d' }}>
            ไปอนุมัติร้าน ›
          </Link>
          <Link to="/admin/returns" style={{ color: '#ee4d2d' }}>
            ไปดูคืนสินค้า ›
          </Link>
          <Link to="/admin/help" style={{ color: '#ee4d2d' }}>
            ไปศูนย์ช่วยเหลือ ›
          </Link>
          <Link to="/admin/wallet" style={{ color: '#ee4d2d' }}>
            ไปอนุมัติถอนเงิน ›
          </Link>
        </div>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>ออเดอร์ล่าสุด</h2>
        {orders.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำสั่งซื้อ</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>รหัส</th>
                <th>สถานะ</th>
                <th>ยอด</th>
                <th>เวลา</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{statusLabel(order.status)}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>{new Date(order.createdAt).toLocaleString('th-TH')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
