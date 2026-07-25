import { useEffect, useState } from 'react'
import { shopApi } from '../../api'
import type { Shop } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminShopsPage() {
  const { toast } = useToast()
  const [shops, setShops] = useState<Shop[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  async function reload() {
    const res = await shopApi.all()
    setShops(res.shops)
  }

  useEffect(() => {
    void reload().catch(() => setShops([]))
  }, [])

  const selected = shops.find((s) => s.id === selectedId) || null

  return (
    <div className="admin-page">
      <h1>ร้านค้า / พ่อค้าแม่ค้า</h1>
      <p className="admin-page__sub">
        ตรวจเอกสาร KYC (บัตรประชาชน + บัญชีธนาคาร) ก่อนอนุมัติ · เห็นสถานะโหมดพักร้อน
      </p>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อร้าน</th>
              <th>สถานะ</th>
              <th>KYC</th>
              <th>พักร้อน</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shops.map((shop) => {
              const kycOk = Boolean(shop.idCardImageUrl && shop.bankAccountNumber)
              return (
                <tr key={shop.id}>
                  <td>
                    {shop.name}
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      {shop.contactName || '—'} · {shop.contactPhone || shop.location}
                    </div>
                  </td>
                  <td>{shop.status}</td>
                  <td style={{ color: kycOk ? '#059669' : '#b45309', fontWeight: 600 }}>
                    {kycOk ? 'ครบ' : 'ไม่ครบ'}
                  </td>
                  <td>
                    {shop.vacationMode ? (
                      <span style={{ color: '#b91c1c', fontWeight: 700 }}>เปิดอยู่</span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="ghost" onClick={() => setSelectedId(shop.id)}>
                        ตรวจเอกสาร
                      </button>
                      {shop.status !== 'active' ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await shopApi.setStatus(shop.id, 'active')
                              toast('อนุมัติร้านแล้ว')
                              await reload()
                            } catch (error) {
                              toast(error instanceof Error ? error.message : 'อนุมัติไม่สำเร็จ')
                            }
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
                      {shop.status === 'pending' || shop.status === 'active' ? (
                        <button
                          type="button"
                          className="danger"
                          onClick={async () => {
                            const reason =
                              rejectReason.trim() ||
                              window.prompt('เหตุผลที่ปฏิเสธ') ||
                              'เอกสารไม่ครบหรือไม่ถูกต้อง'
                            try {
                              await shopApi.setStatus(shop.id, 'rejected', reason)
                              toast('ปฏิเสธร้านแล้ว')
                              setRejectReason('')
                              await reload()
                            } catch (error) {
                              toast(error instanceof Error ? error.message : 'ปฏิเสธไม่สำเร็จ')
                            }
                          }}
                        >
                          ปฏิเสธ
                        </button>
                      ) : null}
                      {shop.vacationMode ? (
                        <button
                          type="button"
                          className="ghost"
                          onClick={async () => {
                            await shopApi.setVacation(shop.id, false)
                            toast('ปิดโหมดพักร้อนให้ร้านแล้ว')
                            await reload()
                          }}
                        >
                          ปิดพักร้อน
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="admin-card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>เอกสาร: {selected.name}</h2>
            <button type="button" className="admin-btn ghost" onClick={() => setSelectedId(null)}>
              ปิด
            </button>
          </div>
          <div className="admin-form-grid" style={{ marginTop: 12 }}>
            <div>
              <strong>ผู้ติดต่อ</strong>
              <p style={{ margin: '4px 0', color: '#374151' }}>
                {selected.contactName || '—'}
                <br />
                {selected.contactPhone || '—'}
                <br />
                {selected.contactEmail || '—'}
              </p>
            </div>
            <div>
              <strong>บัตรประชาชน</strong>
              <p style={{ margin: '4px 0', color: '#374151' }}>{selected.idCardNumber || '—'}</p>
              {selected.idCardImageUrl ? (
                <a href={selected.idCardImageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={selected.idCardImageUrl}
                    alt="บัตรประชาชน"
                    style={{ maxWidth: 280, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                </a>
              ) : (
                <p style={{ color: '#b45309' }}>ยังไม่มีรูปบัตร</p>
              )}
            </div>
            <div>
              <strong>บัญชีธนาคาร</strong>
              <p style={{ margin: '4px 0', color: '#374151' }}>
                {selected.bankName || '—'}
                <br />
                {selected.bankAccountName || '—'}
                <br />
                {selected.bankAccountNumber || '—'}
              </p>
              {selected.bookBankImageUrl ? (
                <a href={selected.bookBankImageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={selected.bookBankImageUrl}
                    alt="หน้าบัญชี"
                    style={{ maxWidth: 280, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                </a>
              ) : null}
            </div>
            <div>
              <strong>อื่นๆ</strong>
              <p style={{ margin: '4px 0', color: '#374151' }}>
                ประเภท: {selected.businessType || 'individual'}
                <br />
                ที่อยู่: {selected.addressLine || selected.location || '—'}
                <br />
                หมายเหตุร้าน: {selected.kycNote || '—'}
                <br />
                เหตุผลปฏิเสธ: {selected.rejectionReason || '—'}
              </p>
              {selected.selfieImageUrl ? (
                <a href={selected.selfieImageUrl} target="_blank" rel="noreferrer">
                  <img
                    src={selected.selfieImageUrl}
                    alt="รูปคู่บัตร"
                    style={{ maxWidth: 200, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  />
                </a>
              ) : null}
            </div>
          </div>
          <label style={{ display: 'grid', gap: 4, marginTop: 12, maxWidth: 420 }}>
            เหตุผลปฏิเสธ (ถ้าต้องการ)
            <input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="เช่น รูปบัตรไม่ชัด / ชื่อบัญชีไม่ตรง"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
