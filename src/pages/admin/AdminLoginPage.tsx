import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const DEMO_USER = 'admin'
const DEMO_PASS = 'greatadmin'

export function AdminLoginPage() {
  const { isAdmin, adminLogin } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState(DEMO_USER)
  const [password, setPassword] = useState(DEMO_PASS)
  const [busy, setBusy] = useState(false)

  if (isAdmin) return <Navigate to="/admin" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await adminLogin(username.trim(), password)
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate('/admin', { replace: true })
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1>DeeJa Admin</h1>
        <p>เข้าสู่ระบบจัดการหลังบ้าน (ไม่ใช่หน้าล็อกอินลูกค้า)</p>
        <form onSubmit={onSubmit}>
          <label>
            ชื่อผู้ใช้หรืออีเมล
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin หรือ admin@great.app"
              autoComplete="username"
              required
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบแอดมิน'}
          </button>
        </form>
        <button
          type="button"
          className="admin-login__demo"
          onClick={() => {
            setUsername(DEMO_USER)
            setPassword(DEMO_PASS)
          }}
        >
          ใส่บัญชีทดลองให้อัตโนมัติ
        </button>
        <p className="admin-login__hint">
          บัญชีทดลอง
          <br />
          ผู้ใช้: <strong>{DEMO_USER}</strong> · รหัส: <strong>{DEMO_PASS}</strong>
          <br />
          หรืออีเมล: <strong>admin@great.app</strong> / <strong>{DEMO_PASS}</strong>
        </p>
        <p className="admin-login__hint">
          <Link to="/login">กลับหน้าเข้าสู่ระบบลูกค้า</Link>
        </p>
      </div>
    </div>
  )
}
