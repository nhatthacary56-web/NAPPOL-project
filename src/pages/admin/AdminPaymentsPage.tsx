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
          paymentMethods: s.paymentMethods || { cod: true, transfer: true, card: true },
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
    const carriers = carriersText
      .split(/\n|,/)
      .map((c) => c.trim())
      .filter(Boolean)
    setBusy(true)
    try {
      const res = await walletApi.updateSettings({
        promptPayPhone: settings.promptPayPhone,
        bankAccount: settings.bankAccount,
        paymentMethods: settings.paymentMethods,
        carriers,
        defaultCarrier: settings.defaultCarrier,
      })
      setSettings(res.settings)
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

  const pm = settings.paymentMethods || { cod: true, transfer: true, card: true }
  const carriers = carriersText
    .split(/\n|,/)
    .map((c) => c.trim())
    .filter(Boolean)

  return (
    <div className="admin-page">
      <h1>การชำระเงินและขนส่ง</h1>
      <p className="admin-page__sub">
        เปิด-ปิดวิธีชำระเงินที่ลูกค้าเห็นตอน Checkout · ตั้ง PromptPay/บัญชี · รายการขนส่งตอนใส่เลขพัสดุ
      </p>

      <form className="admin-card admin-form" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>วิธีชำระเงิน</h2>
        {(
          [
            ['cod', 'เก็บเงินปลายทาง (COD)'],
            ['transfer', 'PromptPay / โอนธนาคาร'],
            ['card', 'บัตรเครดิต/เดบิต (จำลอง)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <input
              type="checkbox"
              checked={pm[key] !== false}
              onChange={(e) =>
                setSettings((prev) =>
                  prev
                    ? {
                        ...prev,
                        paymentMethods: {
                          cod: prev.paymentMethods?.cod !== false,
                          transfer: prev.paymentMethods?.transfer !== false,
                          card: prev.paymentMethods?.card !== false,
                          [key]: e.target.checked,
                        },
                      }
                    : prev,
                )
              }
            />
            {label}
          </label>
        ))}

        <h2 style={{ fontSize: 16 }}>บัญชีรับเงิน (โอน)</h2>
        <div className="admin-form-grid">
          <label>
            PromptPay
            <input
              value={settings.promptPayPhone || ''}
              onChange={(e) =>
                setSettings((prev) => (prev ? { ...prev, promptPayPhone: e.target.value } : prev))
              }
            />
          </label>
          <label>
            ธนาคาร
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
