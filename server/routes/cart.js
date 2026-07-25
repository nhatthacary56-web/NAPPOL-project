import { Router } from 'express'
import { getDb, persist } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

function normalizeCart(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => ({
      productId: String(item.productId || ''),
      variantId: item.variantId ? String(item.variantId) : null,
      variantName: item.variantName ? String(item.variantName) : null,
      qty: Math.max(1, Math.min(99, Number(item.qty) || 1)),
      selected: item.selected !== false,
    }))
    .filter((item) => item.productId)
}

router.get('/', requireAuth, (req, res) => {
  const db = getDb()
  if (!db.carts) db.carts = {}
  const items = normalizeCart(db.carts[req.user.id] || [])
  res.json({ ok: true, items })
})

router.put('/', requireAuth, (req, res) => {
  const db = getDb()
  if (!db.carts) db.carts = {}
  const items = normalizeCart(req.body?.items)
  db.carts[req.user.id] = items
  persist()
  res.json({ ok: true, items })
})

export default router
