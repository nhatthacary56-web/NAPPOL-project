import { useEffect, useState } from 'react'
import { formatPrice } from '../../data/catalog'
import { metaApi } from '../../api'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminReportsPage() {
  const { toast } = useToast()
  const [rows, setRows] = useState<
    Array<{
      orderId: string
      shopName: string
      createdAt: string
      orderStatus: string
      settlementStatus: string
      gross: number
      fee: number
      net: number
    }>
  >([])
  const [totals, setTotals] = useState({ gross: 0, fee: 0, net: 0 })

  useEffect(() => {
    void metaApi
      .commissionReport()
      .then((res) => {
        setRows(res.rows)
        setTotals(res.totals)
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'โหลดรายงานไม่สำเร็จ'))
  }, [toast])

  return (
    <div className="admin-page">
      <h1>รายงานค่าคอมมิชชัน</h1>
      <p className="admin-page__sub">
        รายได้แพลตฟอร์ม (fee) และยอดสุทธิผู้ขาย (net) จากทุกออเดอร์ที่มีการเคลียร์เงิน
      </p>

      <div className="admin-stats">
        <div className="admin-stat">
          <span>ยอดสินค้า (gross)</span>
          <strong>{formatPrice(totals.gross)}</strong>
        </div>
        <div className="admin-stat">
          <span>ค่าคอมแพลตฟอร์ม</span>
          <strong>{formatPrice(totals.fee)}</strong>
        </div>
        <div className="admin-stat">
          <span>สุทธิผู้ขาย</span>
          <strong>{formatPrice(totals.net)}</strong>
        </div>
      </div>

      <div className="admin-card">
        {rows.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีข้อมูล settlement</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ออเดอร์</th>
                <th>ร้าน</th>
                <th>gross</th>
                <th>fee</th>
                <th>net</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.orderId}-${row.shopName}`}>
                  <td>
                    {row.orderId}
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      {new Date(row.createdAt).toLocaleString('th-TH')}
                    </div>
                  </td>
                  <td>{row.shopName}</td>
                  <td>{formatPrice(row.gross)}</td>
                  <td>{formatPrice(row.fee)}</td>
                  <td>{formatPrice(row.net)}</td>
                  <td>
                    {row.settlementStatus} / {row.orderStatus}
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
