import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AuthPages.css'

export function RegisterPage() {
  const { register, brand } = useStore()
  const { appContent } = useCatalog()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const asSeller = params.get('role') === 'seller'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await register({
      name,
      email,
      phone,
      password,
      role: asSeller ? 'seller' : 'buyer',
    })
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate(asSeller ? '/seller' : '/account', { replace: true })
  }

  return (
    <div className="app-frame">
      <PageHeader
        title={asSeller ? 'สมัครผู้ขาย' : 'สมัครสมาชิก'}
        backTo="/login"
        tone="brand"
      />
      <main className="auth-page">
        <p className="auth-page__brand">{brand.logoText}</p>
        <p className="auth-page__hint">
          {asSeller ? appContent.auth.sellerPitch : appContent.auth.buyerPitch}
        </p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            ชื่อ
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            อีเมล
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            เบอร์โทร
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
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
            {busy ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>
        <p className="auth-page__switch">
          มีบัญชีแล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </main>
    </div>
  )
}
