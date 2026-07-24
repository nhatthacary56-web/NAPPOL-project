import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AuthPages.css'

export function LoginPage() {
  const { login, brand } = useStore()
  const { appContent } = useCatalog()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await login(email, password)
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
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            อีเมล
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buyer@great.app"
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
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
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
