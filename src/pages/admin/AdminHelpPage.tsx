import { useEffect, useState } from 'react'
import { helpApi } from '../../api'
import type { ApiHelpTicket } from '../../api/types'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

const statusLabel: Record<ApiHelpTicket['status'], string> = {
  open: 'รอตอบ',
  replied: 'ตอบแล้ว',
  closed: 'ปิด',
}

export function AdminHelpPage() {
  const { toast } = useToast()
  const [tickets, setTickets] = useState<ApiHelpTicket[]>([])
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('open')

  async function load() {
    const res = await helpApi.admin()
    setTickets(res.tickets)
  }

  useEffect(() => {
    void load().catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  const visible = tickets.filter((t) => (filter === 'all' ? true : t.status === filter))

  async function reply(id: string) {
    const adminReply = (replies[id] || '').trim()
    if (!adminReply) {
      toast('กรุณาใส่ข้อความตอบกลับ')
      return
    }
    try {
      await helpApi.reply(id, { adminReply, status: 'replied' })
      toast('ตอบลูกค้าแล้ว')
      setReplies((prev) => ({ ...prev, [id]: '' }))
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ตอบไม่สำเร็จ')
    }
  }

  async function setStatus(id: string, status: ApiHelpTicket['status']) {
    try {
      await helpApi.reply(id, { status })
      toast('อัปเดตสถานะแล้ว')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  return (
    <div className="admin-page">
      <h1>ศูนย์ช่วยเหลือ / ติดต่อแอดมิน</h1>
      <p className="admin-page__sub">
        ข้อความจากลูกค้าผ่านฟอร์มในแอป — ตั้งค่า LINE และช่องทางอื่นได้ที่เมนูเนื้อหาแอป › ช่วยเหลือ
      </p>

      <div className="admin-actions" style={{ marginBottom: 12 }}>
        {(['open', 'replied', 'closed', 'all'] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={filter === key ? 'admin-btn' : 'admin-btn ghost'}
            onClick={() => setFilter(key)}
          >
            {key === 'all'
              ? `ทั้งหมด (${tickets.length})`
              : `${statusLabel[key]} (${tickets.filter((t) => t.status === key).length})`}
          </button>
        ))}
      </div>

      <div className="admin-card">
        {visible.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีข้อความในกลุ่มนี้</p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {visible.map((ticket) => (
              <article
                key={ticket.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>
                    {ticket.topic} · {ticket.userName || ticket.name}
                  </strong>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>
                    {statusLabel[ticket.status]} ·{' '}
                    {new Date(ticket.createdAt).toLocaleString('th-TH')}
                  </span>
                </div>
                <p style={{ margin: '8px 0', fontSize: 14, lineHeight: 1.45 }}>{ticket.message}</p>
                <p style={{ margin: 0, color: '#6b7280', fontSize: 13 }}>
                  {ticket.userEmail || ticket.email}
                  {ticket.phone ? ` · ${ticket.phone}` : ''}
                  {ticket.orderId ? ` · ออเดอร์ ${ticket.orderId}` : ''}
                </p>
                {ticket.adminReply ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: '#fff7f5',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <strong>ตอบแล้ว:</strong> {ticket.adminReply}
                  </div>
                ) : null}
                {ticket.status !== 'closed' ? (
                  <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                    <textarea
                      rows={3}
                      placeholder="พิมพ์ตอบกลับลูกค้า..."
                      value={replies[ticket.id] || ''}
                      onChange={(e) =>
                        setReplies((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                      }
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid #d1d5db',
                        font: 'inherit',
                      }}
                    />
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => void reply(ticket.id)}
                      >
                        ส่งคำตอบ
                      </button>
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => void setStatus(ticket.id, 'closed')}
                      >
                        ปิดเคส
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-actions" style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="admin-btn ghost"
                      onClick={() => void setStatus(ticket.id, 'open')}
                    >
                      เปิดใหม่
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
