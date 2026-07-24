import { Router } from 'express'
import { createId, getDb, persist, pushNotification, publicUser } from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const router = Router()

function serializeTicket(ticket, db) {
  const user = db.users.find((u) => u.id === ticket.userId)
  return {
    ...ticket,
    userName: user?.name || ticket.name || 'ลูกค้า',
    userEmail: user?.email || ticket.email || '',
  }
}

router.post('/tickets', requireAuth, (req, res) => {
  const db = getDb()
  const { topic, message, phone, orderId } = req.body ?? {}
  const body = String(message || '').trim()
  const topicText = String(topic || '').trim()
  if (!topicText || !body) {
    return res.status(400).json({ ok: false, message: 'กรุณาระบุหัวข้อและข้อความ' })
  }
  if (body.length > 2000) {
    return res.status(400).json({ ok: false, message: 'ข้อความยาวเกินไป' })
  }

  const ticket = {
    id: createId('help'),
    userId: req.user.id,
    name: req.user.name,
    email: req.user.email,
    phone: String(phone || req.user.phone || '').trim(),
    topic: topicText,
    message: body,
    orderId: orderId ? String(orderId).trim() : null,
    status: 'open',
    adminReply: null,
    repliedAt: null,
    repliedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  db.helpTickets.unshift(ticket)

  for (const admin of db.users.filter((u) => u.role === 'admin')) {
    pushNotification(admin.id, {
      type: 'help',
      title: 'ข้อความศูนย์ช่วยเหลือใหม่',
      body: `${req.user.name}: ${topicText}`,
      link: '/admin/help',
    })
  }

  persist()
  res.json({ ok: true, ticket: serializeTicket(ticket, db) })
})

router.get('/tickets/mine', requireAuth, (req, res) => {
  const db = getDb()
  const tickets = db.helpTickets
    .filter((t) => t.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ ok: true, tickets: tickets.map((t) => serializeTicket(t, db)) })
})

router.get('/tickets', requireRole('admin'), (_req, res) => {
  const db = getDb()
  const tickets = [...db.helpTickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ ok: true, tickets: tickets.map((t) => serializeTicket(t, db)) })
})

router.patch('/tickets/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  const ticket = db.helpTickets.find((t) => t.id === req.params.id)
  if (!ticket) return res.status(404).json({ ok: false, message: 'ไม่พบข้อความ' })

  const { status, adminReply } = req.body ?? {}
  if (adminReply !== undefined) {
    const reply = String(adminReply || '').trim()
    if (!reply) return res.status(400).json({ ok: false, message: 'กรุณาใส่ข้อความตอบกลับ' })
    ticket.adminReply = reply
    ticket.repliedAt = new Date().toISOString()
    ticket.repliedBy = req.user.id
    if (!status) ticket.status = 'replied'
  }
  if (status && ['open', 'replied', 'closed'].includes(status)) {
    ticket.status = status
  }
  ticket.updatedAt = new Date().toISOString()

  if (adminReply) {
    pushNotification(ticket.userId, {
      type: 'help',
      title: 'แอดมินตอบศูนย์ช่วยเหลือแล้ว',
      body: ticket.adminReply.slice(0, 120),
      link: '/help',
    })
  }

  persist()
  res.json({ ok: true, ticket: serializeTicket(ticket, db), admin: publicUser(req.user) })
})

export default router
