import { useEffect, useState, type FormEvent } from 'react'
import { metaApi, walletApi } from '../../api'
import type { PlatformSettings } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const emptyBank = { bank: '', accountName: '', accountNumber: '' }

export function AdminPaymentsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [carriersText, setCarriersText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void Promise.all([walletApi.settings(), metaApi.storefrontSettings()])
      .then(([w]) => {
        const s = w.settings
        setSettings({
          ...s,
          paymentMethods: {
            cod: s.paymentMethods?.cod !== false,
            transfer: s.paymentMethods?.transfer !== false,
            card: false,
          },
          carriers: s.carriers || [],
          defaultCarrier: s.defaultCarrier || 'Kerry Express',
          bankAccount: s.bankAccount || emptyBank,
        })
        setCarriersText((s.carriers || []).join('\n'))
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!settings) return
    const pm = settings.paymentMethods || { cod: true, transfer: true, card: false }
    if (pm.cod === false && pm.transfer === false) {
      toast('ต้องเปิดอย่างน้อย 1 วิธี: ปลายทาง หรือ QR')
      return
    }
    if (pm.transfer !== false && !String(settings.promptPayPhone || '').trim()) {
      toast('เปิด QR แล้วต้องใส่เบอร์ PromptPay')
      return
    }
    const carriers = carriersText
      .split(/\n|,/)
      .map((c) => c.trim())
      .filter(Boolean)
    setBusy(true)
    try {
      const res = await walletApi.updateSettings({
        promptPayPhone: settings.promptPayPhone,
        bankAccount: settings.bankAccount,
        paymentMethods: {
          cod: pm.cod !== false,
          transfer: pm.transfer !== false,
          card: false,
        },
        carriers,
        defaultCarrier: settings.defaultCarrier,
      })
      setSettings({
        ...res.settings,
        paymentMethods: {
          cod: res.settings.paymentMethods?.cod !== false,
          transfer: res.settings.paymentMethods?.transfer !== false,
          card: false,
        },
      })
      setCarriersText((res.settings.carriers || []).join('\n'))
      toast('บันทึกการชำระเงินและขนส่งแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  if (!settings) {
    return (
      <div className="admin-page">
        <h1>การชำระเงินและขนส่ง</h1>
        <p className="admin-page__sub">กำลังโหลด...</p>
      </div>
    )
  }

  const pm = settings.paymentMethods || { cod: true, transfer: true, card: false }
  const carriers = carriersText
    .split(/\n|,/)
    .map((c) => c.trim())
    .filter(Boolean)

  return (
    <div className="admin-page">
      <h1>การชำระเงินและขนส่ง</h1>
      <p className="admin-page__sub">
        ลูกค้าชำระได้เฉพาะ <strong>เก็บเงินปลายทาง</strong> และ <strong>สแกน QR / PromptPay</strong>
        — ไม่รองรับบัตรเครดิตและ SMS จ่ายเงิน (ประหยัดต้นทุน)
      </p>

      <form className="admin-card admin-form" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>เปิดวิธีชำระเงินให้ลูกค้า</h2>

        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            marginBottom: 12,
            padding: '12px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            background: pm.cod !== false ? '#f0fdf4' : '#fafafa',
          }}
        >
          <input
            type="checkbox"
            checked={pm.cod !== false}
            onChange={(e) =>
              setSettings((prev) =>
                prev
                  ? {
                      ...prev,
                      paymentMethods: {
                        cod: e.target.checked,
                        transfer: prev.paymentMethods?.transfer !== false,
                        card: false,
                      },
                    }
                  : prev,
              )
            }
            style={{ marginTop: 3 }}
          />
          <span>
            <strong>เก็บเงินปลายทาง (COD)</strong>
            <br />
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              ลูกค้าจ่ายเงินสดตอนรับสินค้า — ไม่ต้องตั้งบัญชีรับโอน
            </span>
          </span>
        </label>

        <label
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            marginBottom: 12,
            padding: '12px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            background: pm.transfer !== false ? '#eff6ff' : '#fafafa',
          }}
        >
          <input
            type="checkbox"
            checked={pm.transfer !== false}
            onChange={(e) =>
              setSettings((prev) =>
                prev
                  ? {
                      ...prev,
                      paymentMethods: {
                        cod: prev.paymentMethods?.cod !== false,
                        transfer: e.target.checked,
                        card: false,
                      },
                    }
                  : prev,
              )
            }
            style={{ marginTop: 3 }}
          />
          <span>
            <strong>สแกน QR / PromptPay</strong>
            <br />
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              ลูกค้าสแกน QR หรือโอนเข้าบัญชีแพลตฟอร์ม แล้วกดยืนยันในออเดอร์
            </span>
          </span>
        </label>

        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 0 }}>
          เคล็ดลับ: เปิดอย่างใดอย่างหนึ่งหรือทั้งสองก็ได้ — ถ้าปิดทั้งคู่ระบบจะไม่อนุญาตให้บันทึก
        </p>

        <h2 style={{ fontSize: 16 }}>บัญชีรับเงิน (เมื่อเปิด QR)</h2>
        <div className="admin-form-grid">
          <label>
            เบอร์ PromptPay *
            <input
              value={settings.promptPayPhone || ''}
              onChange={(e) =>
                setSettings((prev) => (prev ? { ...prev, promptPayPhone: e.target.value } : prev))
              }
              placeholder="08xxxxxxxx"
              disabled={pm.transfer === false}
            />
          </label>
          <label>
            ธนาคาร (ทางเลือก)
            <input
              value={settings.bankAccount?.bank || ''}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        bankAccount: { ...(prev.bankAccount || emptyBank), bank: e.target.value },
                      }
                    : prev,
                )
              }
              disabled={pm.transfer === false}
            />
          </label>
          <label>
            ชื่อบัญชี
            <input
              value={settings.bankAccount?.accountName || ''}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        bankAccount: {
                          ...(prev.bankAccount || emptyBank),
                          accountName: e.target.value,
                        },
                      }
                    : prev,
                )
              }
              disabled={pm.transfer === false}
            />
          </label>
          <label>
            เลขบัญชี
            <input
              value={settings.bankAccount?.accountNumber || ''}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        bankAccount: {
                          ...(prev.bankAccount || emptyBank),
                          accountNumber: e.target.value,
                        },
                      }
                    : prev,
                )
              }
              disabled={pm.transfer === false}
            />
          </label>
        </div>

        <h2 style={{ fontSize: 16 }}>ขนส่ง (หนึ่งบรรทัดต่อหนึ่งบริษัท)</h2>
        <label>
          รายการขนส่ง
          <textarea
            rows={6}
            value={carriersText}
            onChange={(e) => setCarriersText(e.target.value)}
            placeholder="Kerry Express&#10;Flash Express"
          />
        </label>
        <label>
          ขนส่งเริ่มต้น
          <select
            value={settings.defaultCarrier || carriers[0] || ''}
            onChange={(e) =>
              setSettings((prev) => (prev ? { ...prev, defaultCarrier: e.target.value } : prev))
            }
          >
            {carriers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="admin-btn" disabled={busy}>
          {busy ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </form>
    </div>
  )
}
