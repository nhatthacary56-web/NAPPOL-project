import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ImageUpload } from '../components/ImageUpload'
import { PageHeader } from '../components/layout/PageHeader'
import { isDefaultDisplayName, needsProfileOnboarding } from '../lib/profile'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AuthPages.css'
import './OnboardingPage.css'

export function OnboardingPage() {
  const { user, updateProfile, brand, bootstrapping, logout } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as { from?: string } | null)?.from &&
    !(location.state as { from?: string }).from?.startsWith('/onboarding')
      ? (location.state as { from: string }).from
      : '/account'

  const [name, setName] = useState(() =>
    user && !isDefaultDisplayName(user.name) ? user.name : '',
  )
  const [birthday, setBirthday] = useState(user?.birthday || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '')
  const [busy, setBusy] = useState(false)

  if (bootstrapping) {
    return (
      <div className="app-frame">
        <main className="auth-page">
          <p className="auth-page__hint">กำลังโหลด...</p>
        </main>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace state={{ from: '/onboarding' }} />
  if (!needsProfileOnboarding(user)) {
    return <Navigate to={from} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast('กรุณาตั้งชื่ออย่างน้อย 2 ตัวอักษร')
      return
    }
    setBusy(true)
    try {
      await updateProfile({
        name: trimmed,
        birthday: birthday || '',
        avatarUrl: avatarUrl || '',
        profileCompleted: true,
      })
      toast('ตั้งโปรไฟล์สำเร็จ ยินดีต้อนรับ')
      navigate(from, { replace: true })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-frame">
      <PageHeader title="ตั้งโปรไฟล์" tone="brand" />
      <main className="auth-page onboarding-page">
        <p className="auth-page__brand">{brand.logoText}</p>
        <p className="auth-page__lead">ยินดีต้อนรับ! ตั้งชื่อและโปรไฟล์ของคุณก่อนเริ่มช้อป</p>
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            ชื่อที่แสดง
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย"
              required
              minLength={2}
              maxLength={60}
              autoFocus
            />
          </label>
          <label>
            วันเกิด <span className="onboarding-page__optional">(ไม่บังคับ)</span>
            <input
              type="date"
              value={birthday}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </label>
          <div className="onboarding-page__avatar">
            <span className="onboarding-page__label">
              รูปโปรไฟล์ <span className="onboarding-page__optional">(ไม่บังคับ)</span>
            </span>
            <ImageUpload value={avatarUrl} onChange={setAvatarUrl} />
          </div>
          <button type="submit" disabled={busy}>
            {busy ? 'กำลังบันทึก...' : 'เริ่มใช้งาน'}
          </button>
        </form>
        <p className="auth-page__hint">สามารถแก้ชื่อ รูป และวันเกิดได้ทีหลังที่ตั้งค่าบัญชี</p>
        <p className="auth-page__switch">
          <button
            type="button"
            className="auth-page__text-btn"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            ออกจากระบบ
          </button>
        </p>
      </main>
    </div>
  )
}
