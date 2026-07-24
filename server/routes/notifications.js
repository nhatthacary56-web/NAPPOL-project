import { Router } from 'express'
import { getDb, persist } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const list = getDb()
    .notifications.filter((n) => n.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({
    ok: true,
    notifications: list,
    unreadCount: list.filter((n) => !n.read).length,
  })
})

router.patch('/read-all', requireAuth, (req, res) => {
  const db = getDb()
  for (const n of db.notifications) {
    if (n.userId === req.user.id) n.read = true
  }
  persist()
  res.json({ ok: true })
})

router.patch('/:id/read', requireAuth, (req, res) => {
  const db = getDb()
  const item = db.notifications.find(
    (n) => n.id === req.params.id && n.userId === req.user.id,
  )
  if (!item) return res.status(404).json({ ok: false, message: 'ไม่พบการแจ้งเตือน' })
  item.read = true
  persist()
  res.json({ ok: true, notification: item })
})

export default router
