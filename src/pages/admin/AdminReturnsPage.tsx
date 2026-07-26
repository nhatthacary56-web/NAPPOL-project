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
        ตรวจคำขอคืนหลังจัดส่ง — อนุมัติแล้วคืนสต็อก หักยอดร้าน และคืนเงินเข้ากระเป๋าลูกค้า
        (กรณีจ่ายออนไลน์)
      </p>
      <div className="admin-card">
        {items.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำขอคืน</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ออเดอร์</th>
                <th>เหตุผล / หลักฐาน</th>
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
                  <td>
                    <div>{item.reason}</div>
                    {item.reasonDetail ? (
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{item.reasonDetail}</div>
                    ) : null}
                    {item.evidenceUrls && item.evidenceUrls.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {item.evidenceUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt=""
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                    {item.refundedToWallet ? (
                      <div style={{ color: '#059669', fontSize: 12, marginTop: 4 }}>
                        คืนกระเป๋าลูกค้า {formatPrice(item.refundedToWallet)}
                      </div>
                    ) : null}
                  </td>
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
