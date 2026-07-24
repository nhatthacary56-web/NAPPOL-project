import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { helpApi } from '../api'
import type { ApiHelpTicket } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { defaultAppContent } from '../data/appContent'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './HelpCenterPage.css'

const channelIcon: Record<string, string> = {
  line: '💬',
  facebook: '📘',
  phone: '📞',
  email: '✉️',
  other: '🔗',
}

const statusLabel: Record<ApiHelpTicket['status'], string> = {
  open: 'รอแอดมิน',
  replied: 'ตอบแล้ว',
  closed: 'ปิดแล้ว',
}

export function HelpCenterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useStore()
  const { appContent } = useCatalog()
  const help = { ...defaultAppContent.help, ...appContent.help }

  const [topic, setTopic] = useState(help.topics[0] || 'อื่นๆ')
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [orderId, setOrderId] = useState('')
  const [busy, setBusy] = useState(false)
  const [tickets, setTickets] = useState<ApiHelpTicket[]>([])

  const channels = useMemo(
    () =>
      [...(help.channels || [])]
        .filter((c) => c.active !== false)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)),
    [help.channels],
  )

  async function loadMine() {
    if (!user) {
      setTickets([])
      return
    }
    const res = await helpApi.mine()
    setTickets(res.tickets)
  }

  useEffect(() => {
    void loadMine().catch(() => setTickets([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  useEffect(() => {
    if (user?.phone) setPhone(user.phone)
  }, [user?.phone])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/help' } })
      return
    }
    setBusy(true)
    try {
      await helpApi.create({
        topic,
        message: message.trim(),
        phone: phone.trim(),
        orderId: orderId.trim() || undefined,
      })
      setMessage('')
      setOrderId('')
      toast('ส่งข้อความถึงแอดมินแล้ว')
      await loadMine()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ส่งไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-frame">
      <PageHeader title={help.title || 'ศูนย์ความช่วยเหลือ'} backTo="/account" />
      <main className="help-page">
        {help.subtitle ? <p className="help-page__intro">{help.subtitle}</p> : null}

        <section className="help-card">
          <h2>{help.formTitle || 'ส่งข้อความถึงแอดมิน'}</h2>
          {help.formHint ? <p className="help-card__hint">{help.formHint}</p> : null}

          {!user ? (
            <p className="help-card__login">
              <Link to="/login" state={{ from: '/help' }}>
                เข้าสู่ระบบ
              </Link>{' '}
              เพื่อส่งข้อความถึงแอดมิน
            </p>
          ) : (
            <form className="help-form" onSubmit={onSubmit}>
              <label>
                หัวข้อ
                <select value={topic} onChange={(e) => setTopic(e.target.value)} required>
                  {(help.topics?.length ? help.topics : ['อื่นๆ']).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                เบอร์ติดต่อกลับ
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                />
              </label>
              <label>
                เลขออเดอร์ (ถ้ามี)
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="เช่น ord_..."
                />
              </label>
              <label>
                รายละเอียด
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="อธิบายปัญหาหรือคำถามของคุณ"
                  required
                />
              </label>
              <button type="submit" disabled={busy}>
                {busy ? 'กำลังส่ง...' : 'ส่งถึงแอดมิน'}
              </button>
            </form>
          )}
        </section>

        {user && tickets.length > 0 ? (
          <section className="help-card">
            <h2>ข้อความของฉัน</h2>
            <div className="help-tickets">
              {tickets.map((ticket) => (
                <article key={ticket.id} className="help-ticket">
                  <div className="help-ticket__head">
                    <strong>{ticket.topic}</strong>
                    <em data-status={ticket.status}>{statusLabel[ticket.status]}</em>
                  </div>
                  <p>{ticket.message}</p>
                  <time>{new Date(ticket.createdAt).toLocaleString('th-TH')}</time>
                  {ticket.adminReply ? (
                    <div className="help-ticket__reply">
                      <strong>แอดมินตอบ:</strong>
                      <p>{ticket.adminReply}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="help-card help-channels">
          <h2>{help.channelsTitle || 'ช่องทางติดต่ออื่น'}</h2>
          {channels.length === 0 ? (
            <p className="help-card__hint">ยังไม่มีช่องทาง — แอดมินตั้งค่าได้ที่หลังบ้าน</p>
          ) : (
            <ul className="help-channel-list">
              {channels.map((channel) => {
                const href =
                  channel.link ||
                  (channel.type === 'phone'
                    ? `tel:${channel.value.replace(/\D/g, '')}`
                    : channel.type === 'email'
                      ? `mailto:${channel.value}`
                      : channel.type === 'line'
                        ? `https://line.me/R/ti/p/${channel.value.replace(/^@/, '@')}`
                        : undefined)
                const inner = (
                  <>
                    <span className="help-channel__icon" aria-hidden="true">
                      {channelIcon[channel.type] || channelIcon.other}
                    </span>
                    <span>
                      <strong>{channel.label}</strong>
                      <em>{channel.value}</em>
                    </span>
                  </>
                )
                return (
                  <li key={channel.id}>
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="help-channel">
                        {inner}
                      </a>
                    ) : (
                      <div className="help-channel">{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
