import { Router } from 'express'
import { enrichProduct, getDb, persist } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const db = getDb()
  const ids = db.wishlists.filter((w) => w.userId === req.user.id).map((w) => w.productId)
  const products = ids
    .map((id) => db.products.find((p) => p.id === id))
    .filter(Boolean)
    .map(enrichProduct)
  res.json({ ok: true, productIds: ids, products })
})

router.post('/:productId', requireAuth, (req, res) => {
  const db = getDb()
  const productId = req.params.productId
  const exists = db.wishlists.some(
    (w) => w.userId === req.user.id && w.productId === productId,
  )
  if (!exists) {
    db.wishlists.push({ userId: req.user.id, productId })
    persist()
  }
  res.json({ ok: true })
})

router.delete('/:productId', requireAuth, (req, res) => {
  const db = getDb()
  db.wishlists = db.wishlists.filter(
    (w) => !(w.userId === req.user.id && w.productId === req.params.productId),
  )
  persist()
  res.json({ ok: true })
})

export default router
