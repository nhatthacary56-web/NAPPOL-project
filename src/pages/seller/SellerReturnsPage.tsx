import { useEffect, useState } from 'react'
import { formatPrice } from '../../data/catalog'
import { returnApi } from '../../api'
import type { ApiReturn } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './SellerShell.css'

export function SellerReturnsPage() {
  const { toast } = useToast()
  const [items, setItems] = useState<ApiReturn[]>([])

  async function load() {
    const res = await returnApi.seller()
    setItems(res.returns)
  }

  useEffect(() => {
    void load().catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  async function decide(id: string, status: 'approved' | 'rejected') {
    try {
      await returnApi.setStatus(id, status === 'approved' ? 'refunded' : 'rejected')
      toast(status === 'approved' ? 'อนุมัติคืนเงินแล้ว' : 'ปฏิเสธแล้ว')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  return (
    <div className="seller-page">
      <h1>คืนสินค้า</h1>
      <p className="seller-page__sub">
        คำขอคืนจากลูกค้า — อนุมัติแล้วระบบคืนเงินเข้ากระเป๋าลูกค้า (ถ้าจ่ายออนไลน์) และหักยอดร้าน
      </p>
      <div className="seller-card">
        {items.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำขอ</p>
        ) : (
          <table className="seller-table">
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
                  <td>{item.orderId}</td>
                  <td>
                    <div>{item.reason}</div>
                    {item.reasonDetail ? (
                      <div style={{ color: '#6b7280', fontSize: 12 }}>{item.reasonDetail}</div>
                    ) : null}
                    {item.evidenceUrls?.length ? (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        {item.evidenceUrls.map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt=""
                              style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }}
                            />
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td>{formatPrice(item.amount)}</td>
                  <td>{item.status}</td>
                  <td>
                    {item.status === 'pending' ? (
                      <div className="seller-actions">
                        <button
                          type="button"
                          className="seller-btn"
                          onClick={() => void decide(item.id, 'approved')}
                        >
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          className="seller-btn ghost"
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
