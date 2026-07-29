import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { authApi } from '../api'
import { PageHeader } from '../components/layout/PageHeader'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './SettingsPage.css'

type Providers = Awaited<ReturnType<typeof authApi.providers>>['providers'] & {
  lineReady?: boolean
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, string | number>,
          ) => void
        }
      }
    }
  }
}

export function SettingsPage() {
  const {
    user,
    updateProfile,
    requestPhoneOtp,
    linkGoogle,
    unlinkGoogle,
    linkLine,
    unlinkLine,
    linkPhone,
    setPassword,
    deleteAccount,
  } = useStore()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [editPhone, setEditPhone] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [providers, setProviders] = useState<Providers | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const isNativeApp = Capacitor.isNativePlatform()

  useEffect(() => {
    setName(user?.name ?? '')
    setPhone(user?.phone ?? '')
  }, [user?.name, user?.phone])

  useEffect(() => {
    void authApi
      .providers()
      .then((res) => setProviders(res.providers))
      .catch(() =>
        setProviders({
          phone: true,
          google: true,
          line: true,
          email: true,
          googleClientId: null,
          lineChannelId: null,
          lineRedirectUri: null,
          demoOtp: true,
          demoSocial: true,
          smsReady: false,
        }),
      )
  }, [])

  useEffect(() => {
    if (isNativeApp) return
    if (!providers?.googleClientId || !googleBtnRef.current || user?.googleLinked) return
    const clientId = providers.googleClientId

    function mountButton() {
      if (!window.google || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          void (async () => {
            setBusy(true)
            const result = await linkGoogle({ credential: response.credential })
            setBusy(false)
            toast(result.message)
          })()
        },
      })
      googleBtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'continue_with',
        shape: 'rectangular',
      })
    }

    if (window.google) {
      mountButton()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = mountButton
    document.body.appendChild(script)
  }, [isNativeApp, providers?.googleClientId, user?.googleLinked, linkGoogle, toast])

  if (!user) return <Navigate to="/login" replace state={{ from: '/settings' }} />

  const me = user

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    try {
      await updateProfile({ name: name.trim() })
      toast('บันทึกโปรไฟล์แล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function onRequestOtp(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await requestPhoneOtp(phone)
    setBusy(false)
    toast(result.message)
    if (result.ok) {
      setOtpSent(true)
      if (result.demoCode) setOtp(result.demoCode)
    }
  }

  async function onLinkPhone(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await linkPhone(phone.trim(), otp.trim())
    setBusy(false)
    toast(result.message)
    if (result.ok) {
      setOtpSent(false)
      setOtp('')
      setEditPhone(false)
    }
  }

  async function onPassword(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await setPassword({
      currentPassword: me.hasPassword ? currentPassword : undefined,
      newPassword,
    })
    setBusy(false)
    toast(result.message)
    if (result.ok) {
      setCurrentPassword('')
      setNewPassword('')
    }
  }

  function startLineLink() {
    if (providers?.lineChannelId && providers?.lineRedirectUri) {
      const state = `link_${Date.now()}_${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem('line.login.from', '/settings')
      sessionStorage.setItem('line.login.state', state)
      sessionStorage.setItem('line.login.mode', 'link')
      const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', providers.lineChannelId)
      url.searchParams.set('redirect_uri', providers.lineRedirectUri)
      url.searchParams.set('state', state)
      url.searchParams.set('scope', 'profile openid')
      window.location.href = url.toString()
      return
    }
    void (async () => {
      setBusy(true)
      const result = await linkLine({ demoName: me.name || 'LINE User' })
      setBusy(false)
      toast(result.message)
    })()
  }

  return (
    <div className="app-frame">
      <PageHeader title="ตั้งค่าบัญชี" backTo="/account" />
      <main className="settings-page">
        <section className="settings-card">
          <h2>โปรไฟล์</h2>
          <form onSubmit={onSaveProfile}>
            <label>
              ชื่อที่แสดง
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              อีเมล
              <input value={me.email} disabled />
            </label>
            <button type="submit" disabled={busy}>
              บันทึกโปรไฟล์
            </button>
          </form>
        </section>

        <section className="settings-card">
          <h2>ช่องทางเข้าสู่ระบบ</h2>
          <p className="settings-hint">
            เชื่อมเพิ่มได้ เช่น เข้าด้วยอีเมลอยู่แล้ว ก็ยังผูก LINE / Google เข้าบัญชีเดิมได้
          </p>

          <div className="settings-link-row">
            <div>
              <strong>อีเมล / รหัสผ่าน</strong>
              <em>{me.hasPassword ? 'ตั้งรหัสแล้ว' : 'ยังไม่มีรหัสผ่าน'}</em>
            </div>
            <span className={me.hasPassword ? 'ok' : 'warn'}>
              {me.hasPassword ? 'พร้อมใช้' : 'ยังไม่ตั้ง'}
            </span>
          </div>

          <div className="settings-link-row">
            <div>
              <strong>เบอร์โทร (OTP)</strong>
              <em>{me.phone || 'ยังไม่ได้เชื่อม'}</em>
            </div>
            {me.phone && !editPhone ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditPhone(true)
                  setOtpSent(false)
                  setOtp('')
                }}
              >
                เปลี่ยนเบอร์
              </button>
            ) : (
              <span className={me.phone ? 'ok' : 'warn'}>
                {me.phone ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม'}
              </span>
            )}
          </div>

          {!me.phone || editPhone ? (
            <form
              className="settings-inline-form"
              onSubmit={otpSent ? onLinkPhone : onRequestOtp}
            >
              <label>
                เบอร์โทร
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08xxxxxxxx"
                  required
                />
              </label>
              {otpSent ? (
                <label>
                  รหัส OTP
                  <input value={otp} onChange={(e) => setOtp(e.target.value)} required />
                </label>
              ) : null}
              <button type="submit" disabled={busy}>
                {otpSent ? 'ยืนยันและเชื่อมเบอร์' : 'ส่ง OTP เพื่อเชื่อมเบอร์'}
              </button>
            </form>
          ) : null}

          <div className="settings-link-row">
            <div>
              <strong>Google</strong>
              <em>{me.googleLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม'}</em>
            </div>
            {me.googleLinked ? (
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    const result = await unlinkGoogle()
                    setBusy(false)
                    toast(result.message)
                  })()
                }}
              >
                ยกเลิกเชื่อม
              </button>
            ) : providers?.googleClientId && !isNativeApp ? (
              <div ref={googleBtnRef} />
            ) : providers?.googleClientId && isNativeApp ? (
              <em style={{ fontSize: 12, color: 'var(--muted, #666)' }}>
                บนแอปให้เข้าด้วยอีเมล — ปุ่ม Google ใน WebView มักใช้ไม่ได้
              </em>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    const result = await linkGoogle({
                      demoEmail: me.email,
                      demoName: me.name,
                    })
                    setBusy(false)
                    toast(result.message)
                  })()
                }}
              >
                เชื่อม Google
              </button>
            )}
          </div>

          <div className="settings-link-row">
            <div>
              <strong>LINE</strong>
              <em>{me.lineLinked ? 'เชื่อมแล้ว' : 'ยังไม่เชื่อม'}</em>
            </div>
            {me.lineLinked ? (
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => {
                  void (async () => {
                    setBusy(true)
                    const result = await unlinkLine()
                    setBusy(false)
                    toast(result.message)
                  })()
                }}
              >
                ยกเลิกเชื่อม
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={startLineLink}>
                เชื่อม LINE
              </button>
            )}
          </div>
        </section>

        <section className="settings-card">
          <h2>{me.hasPassword ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}</h2>
          <p className="settings-hint">
            ตั้งรหัสผ่านแล้วจะเข้าด้วยอีเมลได้แม้เดิมสมัครด้วย LINE/Google
          </p>
          <form onSubmit={onPassword}>
            {me.hasPassword ? (
              <label>
                รหัสผ่านปัจจุบัน
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </label>
            ) : null}
            <label>
              รหัสผ่านใหม่
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              {me.hasPassword ? 'เปลี่ยนรหัสผ่าน' : 'ตั้งรหัสผ่าน'}
            </button>
          </form>
        </section>

        {me.role !== 'admin' ? (
          <section className="settings-card settings-danger">
            <h2>ลบบัญชี</h2>
            <p className="settings-hint">
              ลบข้อมูลส่วนตัวถาวร (ชื่อ อีเมล เบอร์ ที่อยู่ ตะกร้า) — ออเดอร์เก่ายังอยู่ในระบบแบบไม่ระบุตัวตน
              ต้องไม่มีออเดอร์ที่กำลังดำเนินการ
            </p>
            <label>
              พิมพ์ DELETE เพื่อยืนยัน
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="settings-danger-btn"
              disabled={busy || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
              onClick={() => {
                void (async () => {
                  if (!window.confirm('ยืนยันลบบัญชี? การกระทำนี้ย้อนกลับไม่ได้')) return
                  setBusy(true)
                  const result = await deleteAccount()
                  setBusy(false)
                  toast(result.message)
                  if (result.ok) window.location.href = '/'
                })()
              }}
            >
              ลบบัญชีถาวร
            </button>
          </section>
        ) : null}

        <section className="settings-card settings-links">
          <Link to="/privacy">นโยบายความเป็นส่วนตัว</Link>
          <Link to="/terms">ข้อกำหนดการใช้งาน</Link>
          <Link to="/help">ศูนย์ความช่วยเหลือ</Link>
        </section>
      </main>
    </div>
  )
}
