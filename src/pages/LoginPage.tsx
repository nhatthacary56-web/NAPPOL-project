import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi } from '../api'
import { PageHeader } from '../components/layout/PageHeader'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AuthPages.css'

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

export function LoginPage() {
  const {
    login,
    loginWithPhone,
    requestPhoneOtp,
    loginWithGoogle,
    loginWithLine,
    brand,
  } = useStore()
  const { appContent } = useCatalog()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'

  const [providers, setProviders] = useState<Providers | null>(null)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)

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
        }),
      )
  }, [])

  useEffect(() => {
    if (!providers?.googleClientId || !googleBtnRef.current) return
    const clientId = providers.googleClientId

    function mountButton() {
      if (!window.google || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          void (async () => {
            setBusy(true)
            const result = await loginWithGoogle({ credential: response.credential })
            setBusy(false)
            toast(result.message)
            if (result.ok) navigate(from, { replace: true })
          })()
        },
      })
      googleBtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
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
  }, [providers?.googleClientId, loginWithGoogle, toast, navigate, from])

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

  async function onVerifyOtp(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await loginWithPhone(phone, otp)
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate(from, { replace: true })
  }

  async function onEmailLogin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await login(email, password)
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate(from, { replace: true })
  }

  async function onDemoGoogle() {
    setBusy(true)
    const result = await loginWithGoogle({
      demoEmail: 'buyer.google@gmail.com',
      demoName: 'Google Buyer',
    })
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate(from, { replace: true })
  }

  function onLineLogin() {
    if (providers?.lineChannelId && providers?.lineRedirectUri) {
      const state = `${Date.now()}_${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem('line.login.from', from)
      sessionStorage.setItem('line.login.state', state)
      const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', providers.lineChannelId)
      url.searchParams.set('redirect_uri', providers.lineRedirectUri)
      url.searchParams.set('state', state)
      url.searchParams.set('scope', 'profile openid')
      window.location.href = url.toString()
      return
    }
    void onDemoLine()
  }

  async function onDemoLine() {
    setBusy(true)
    const result = await loginWithLine({ demoName: 'LINE Buyer' })
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate(from, { replace: true })
  }

  return (
    <div className="app-frame">
      <PageHeader title="เข้าสู่ระบบ" backTo="/account" tone="brand" />
      <main className="auth-page">
        <p className="auth-page__brand">{brand.logoText}</p>
        {brand.tagline ? <p className="auth-page__hint">{brand.tagline}</p> : null}
        <p className="auth-page__lead">เข้าสู่ระบบด้วยเบอร์โทร Google หรือ LINE</p>

        <section className="auth-card">
          <h2>เข้าด้วยเบอร์โทร</h2>
          {!otpSent ? (
            <form className="auth-form" onSubmit={onRequestOtp}>
              <label>
                เบอร์มือถือ
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  required
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? 'กำลังส่งรหัส...' : 'ขอรหัส OTP'}
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={onVerifyOtp}>
              <p className="auth-page__hint" style={{ textAlign: 'left', margin: 0 }}>
                ยังไม่ส่ง SMS จริง (ประหยัดต้นทุน) · รหัสยืนยันในแอปสำหรับเบอร์ {phone}
                {providers?.demoOtp ? ' · ทดลองใช้ 123456' : ''}
              </p>
              <label>
                รหัส OTP
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6 หลัก"
                  required
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? 'กำลังยืนยัน...' : 'ยืนยันและเข้าสู่ระบบ'}
              </button>
              <button
                type="button"
                className="auth-btn-ghost"
                disabled={busy}
                onClick={() => {
                  setOtpSent(false)
                  setOtp('')
                }}
              >
                เปลี่ยนเบอร์
              </button>
            </form>
          )}
        </section>

        <div className="auth-divider">
          <span>หรือ</span>
        </div>

        <section className="auth-social">
          {providers?.googleClientId ? (
            <div ref={googleBtnRef} className="auth-google-btn" />
          ) : (
            <button
              type="button"
              className="auth-social-btn auth-social-btn--google"
              disabled={busy || providers?.google === false}
              onClick={() => void onDemoGoogle()}
            >
              เข้าสู่ระบบด้วย Google / Gmail
            </button>
          )}
          <button
            type="button"
            className="auth-social-btn auth-social-btn--line"
            disabled={busy || providers?.line === false}
            onClick={() => onLineLogin()}
          >
            เข้าสู่ระบบด้วย LINE
          </button>
        </section>

        <button
          type="button"
          className="auth-email-toggle"
          onClick={() => setShowEmail((v) => !v)}
        >
          {showEmail ? 'ซ่อนอีเมล/รหัสผ่าน' : 'เข้าด้วยอีเมล'}
        </button>

        {showEmail ? (
          <form className="auth-form auth-card" onSubmit={onEmailLogin}>
            <label>
              อีเมล
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </label>
            <label>
              รหัสผ่าน
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วยอีเมล'}
            </button>
          </form>
        ) : null}

        <p className="auth-page__switch">
          ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
        </p>
        <p className="auth-page__switch">
          เป็นพ่อค้าแม่ค้า? <Link to="/register?role=seller">สมัครผู้ขาย</Link>
        </p>
        <p className="auth-page__hint">{appContent.auth.loginHint}</p>
      </main>
    </div>
  )
}
