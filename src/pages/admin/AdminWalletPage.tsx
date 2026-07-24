import { useEffect, useState, type FormEvent } from 'react'
import { formatPrice } from '../../data/catalog'
import { walletApi } from '../../api'
import type { ApiWithdrawal, PlatformSettings } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminWalletPage() {
  const { toast } = useToast()
  const [withdrawals, setWithdrawals] = useState<ApiWithdrawal[]>([])
  const [settings, setSettings] = useState<PlatformSettings | null>(null)

  async function load() {
    const [w, s] = await Promise.all([walletApi.withdrawals(), walletApi.settings()])
    setWithdrawals(w.withdrawals)
    setSettings(s.settings)
  }

  useEffect(() => {
    void load().catch((error) =>
      toast(error instanceof Error ? error.message : 'โหลดไม่สำเร็จ'),
    )
  }, [toast])

  async function decide(id: string, status: 'approved' | 'rejected') {
    try {
      await walletApi.setWithdrawalStatus(id, status)
      toast(status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    try {
      await walletApi.updateSettings(settings)
      toast('บันทึกการตั้งค่าชำระเงินแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>กระเป๋าเงิน / ชำระเงิน</h1>
      <p className="admin-page__sub">อนุมัติถอนเงินผู้ขาย และตั้งค่า PromptPay / บัญชีโอน</p>

      {settings ? (
        <form className="admin-card admin-form" onSubmit={saveSettings}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>ตั้งค่าแพลตฟอร์ม</h2>
          <label>
            ค่าคอมมิชชัน (0–0.3)
            <input
              type="number"
              step="0.01"
              min={0}
              max={0.3}
              value={settings.commissionRate}
              onChange={(e) =>
                setSettings({ ...settings, commissionRate: Number(e.target.value) })
              }
            />
          </label>
          <label>
            ค่าส่งปกติ (บาท)
            <input
              type="number"
              min={0}
              value={settings.shippingFee ?? 40}
              onChange={(e) =>
                setSettings({ ...settings, shippingFee: Number(e.target.value) })
              }
            />
          </label>
          <label>
            ส่งฟรีเมื่อครบ (บาท)
            <input
              type="number"
              min={0}
              value={settings.freeShippingMin ?? 199}
              onChange={(e) =>
                setSettings({ ...settings, freeShippingMin: Number(e.target.value) })
              }
            />
          </label>
          <label>
            เบอร์ PromptPay
            <input
              value={settings.promptPayPhone}
              onChange={(e) => setSettings({ ...settings, promptPayPhone: e.target.value })}
            />
          </label>
          <label>
            ธนาคาร
            <input
              value={settings.bankAccount.bank}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankAccount: { ...settings.bankAccount, bank: e.target.value },
                })
              }
            />
          </label>
          <label>
            ชื่อบัญชี
            <input
              value={settings.bankAccount.accountName}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankAccount: { ...settings.bankAccount, accountName: e.target.value },
                })
              }
            />
          </label>
          <label>
            เลขบัญชี
            <input
              value={settings.bankAccount.accountNumber}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  bankAccount: { ...settings.bankAccount, accountNumber: e.target.value },
                })
              }
            />
          </label>
          <button type="submit" className="admin-btn">
            บันทึก
          </button>
        </form>
      ) : null}

      <div className="admin-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>คำขอถอนเงิน</h2>
        {withdrawals.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำขอ</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ร้าน</th>
                <th>ยอด</th>
                <th>สถานะ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td>
                    {w.shopName || w.shopId}
                    <div style={{ color: '#6b7280', fontSize: 12 }}>
                      {new Date(w.createdAt).toLocaleString('th-TH')}
                      {w.note ? ` · ${w.note}` : ''}
                    </div>
                  </td>
                  <td>{formatPrice(w.amount)}</td>
                  <td>{w.status}</td>
                  <td>
                    {w.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => void decide(w.id, 'approved')}
                        >
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          className="admin-btn ghost"
                          onClick={() => void decide(w.id, 'rejected')}
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
