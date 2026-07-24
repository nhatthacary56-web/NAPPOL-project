import { useEffect, useState } from 'react'
import { formatPrice } from '../../data/catalog'
import { returnApi } from '../../api'
import type { ApiReturn } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminReturnsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ApiReturn[]>([])

  async function load() {
    const res = await returnApi.admin()
    setItems(res.returns)
  }

  useEffect(() => {
    void load().catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  async function decide(id: string, status: 'approved' | 'rejected') {
    try {
      await returnApi.setStatus(id, status === 'approved' ? 'refunded' : 'rejected')
      toast(status === 'approved' ? 'อนุมัติและคืนเงินแล้ว' : 'ปฏิเสธแล้ว')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>คืนสินค้า / คืนเงิน</h1>
      <p className="admin-page__sub">
        ตรวจคำขอยกเลิกหลังรับของ — อนุมัติแล้วระบบจะคืนสต็อกและหักยอดกระเป๋าเงินร้าน
      </p>
      <div className="admin-card">
        {items.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำขอคืน</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ออเดอร์</th>
                <th>เหตุผล</th>
                <th>ยอด</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.orderId}
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      {item.shopName} · {new Date(item.createdAt).toLocaleString('th-TH')}
                    </div>
                  </td>
                  <td>{item.reason}</td>
                  <td>{formatPrice(item.amount)}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.status === 'pending' ? (
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => void decide(item.id, 'approved')}
                        >
                          อนุมัติคืนเงิน
                        </button>
                        <button
                          type="button"
                          className="admin-btn ghost"
                          onClick={() => void decide(item.id, 'rejected')}
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
