import { useEffect, useState } from 'react'
import { metaApi } from '../../api'
import type { ApiUser } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<ApiUser[]>([])

  async function load() {
    const res = await metaApi.users()
    setUsers(res.users)
  }

  useEffect(() => {
    void load().catch(() => setUsers([]))
  }, [])

  async function patch(id: string, body: { role?: string; banned?: boolean }) {
    try {
      await metaApi.updateUser(id, body)
      toast('อัปเดตสมาชิกแล้ว')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>สมาชิก</h1>
      <p className="admin-page__sub">เปลี่ยนบทบาทหรือระงับบัญชีผู้ใช้</p>
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>อีเมล</th>
              <th>บทบาท</th>
              <th>เหรียญ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  {user.name}
                  {(user as ApiUser & { banned?: boolean }).banned ? (
                    <div style={{ color: '#b91c1c', fontSize: 12 }}>ถูกระงับ</div>
                  ) : null}
                </td>
                <td>{user.email}</td>
                <td>
                  <select
                    value={user.role}
                    onChange={(e) => void patch(user.id, { role: e.target.value })}
                  >
                    <option value="buyer">buyer</option>
                    <option value="seller">seller</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>{user.coins}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn ghost"
                    onClick={() =>
                      void patch(user.id, {
                        banned: !(user as ApiUser & { banned?: boolean }).banned,
                      })
                    }
                  >
                    {(user as ApiUser & { banned?: boolean }).banned ? 'ปลดแบน' : 'ระงับ'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
