import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AuthPages.css'

export function LineCallbackPage() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { loginWithLine } = useStore()
  const [message, setMessage] = useState('กำลังเข้าสู่ระบบด้วย LINE...')

  useEffect(() => {
    const code = search.get('code')
    const error = search.get('error_description') || search.get('error')
    const from = sessionStorage.getItem('line.login.from') || '/account'
    const expectedState = sessionStorage.getItem('line.login.state')
    const state = search.get('state')

    async function run() {
      if (error) {
        setMessage(error)
        toast(error)
        navigate('/login', { replace: true })
        return
      }
      if (!code) {
        setMessage('ไม่พบรหัสจาก LINE')
        toast('ไม่พบรหัสจาก LINE')
        navigate('/login', { replace: true })
        return
      }
      if (expectedState && state !== expectedState) {
        setMessage('ยืนยัน state ไม่ผ่าน')
        toast('LINE login ไม่ปลอดภัย — ลองใหม่')
        navigate('/login', { replace: true })
        return
      }

      const result = await loginWithLine({ code })
      toast(result.message)
      sessionStorage.removeItem('line.login.from')
      sessionStorage.removeItem('line.login.state')
      if (result.ok) navigate(from, { replace: true })
      else navigate('/login', { replace: true })
    }

    void run()
  }, [search, loginWithLine, navigate, toast])

  return (
    <div className="app-frame">
      <PageHeader title="LINE Login" backTo="/login" tone="brand" />
      <main className="auth-page">
        <p className="auth-page__lead">{message}</p>
      </main>
    </div>
  )
}
