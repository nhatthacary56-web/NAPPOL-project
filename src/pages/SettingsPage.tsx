import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './SettingsPage.css'

export function SettingsPage() {
  const { user, updateProfile } = useStore()
  const { toast } = useToast()
  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() })
      toast('บันทึกโปรไฟล์แล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  return (
    <div className="app-frame">
      <PageHeader title="ตั้งค่าบัญชี" backTo="/account" />
      <main className="settings-page">
        <form onSubmit={onSubmit}>
          <label>
            ชื่อที่แสดง
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            อีเมล
            <input value={user?.email ?? ''} disabled />
          </label>
          <label>
            เบอร์โทร
            <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </label>
          <button type="submit">บันทึก</button>
        </form>
      </main>
    </div>
  )
}
