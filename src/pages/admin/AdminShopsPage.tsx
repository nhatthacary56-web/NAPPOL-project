import { useEffect, useState } from 'react'
import { shopApi } from '../../api'
import type { Shop } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminShopsPage() {
  const { toast } = useToast()
  const [shops, setShops] = useState<Shop[]>([])

  async function reload() {
    const res = await shopApi.all()
    setShops(res.shops)
  }

  useEffect(() => {
    void reload().catch(() => setShops([]))
  }, [])

  return (
    <div className="admin-page">
      <h1>ร้านค้า / พ่อค้าแม่ค้า</h1>
      <p className="admin-page__sub">อนุมัติร้านเพื่อให้ลงสินค้าและขายบนแพลตฟอร์มได้</p>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อร้าน</th>
              <th>slug</th>
              <th>สถานะ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => (
              <tr key={shop.id}>
                <td>
                  {shop.name}
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{shop.location}</div>
                </td>
                <td>{shop.slug}</td>
                <td>{shop.status}</td>
                <td>
                  <div className="admin-actions">
                    {shop.status !== 'active' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await shopApi.setStatus(shop.id, 'active')
                          toast('อนุมัติร้านแล้ว')
                          await reload()
                        }}
                      >
                        อนุมัติ
                      </button>
                    ) : null}
                    {shop.status === 'active' ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={async () => {
                          await shopApi.setStatus(shop.id, 'suspended')
                          toast('ระงับร้านแล้ว')
                          await reload()
                        }}
                      >
                        ระงับ
                      </button>
                    ) : null}
                    {shop.status === 'pending' ? (
                      <button
                        type="button"
                        className="danger"
                        onClick={async () => {
                          await shopApi.setStatus(shop.id, 'rejected')
                          toast('ปฏิเสธร้านแล้ว')
                          await reload()
                        }}
                      >
                        ปฏิเสธ
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
