import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminLoginPage() {
  const { isAdmin, adminLogin } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAdmin) return <Navigate to="/admin" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const result = await adminLogin(username, password)
    setBusy(false)
    toast(result.message)
    if (result.ok) navigate('/admin', { replace: true })
  }

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <h1>Great Admin</h1>
        <p>เข้าสู่ระบบจัดการร้านค้า</p>
        <form onSubmit={onSubmit}>
          <label>
            ชื่อผู้ใช้
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
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
        <p className="admin-login__hint">
          บัญชีทดลอง: <strong>admin</strong> / <strong>greatadmin</strong>
          <br />
          หรือ admin@great.app / greatadmin
        </p>
      </div>
    </div>
  )
}
