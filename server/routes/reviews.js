import { Router } from 'express'
import { createId, getDb, persist, findUserById } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', (req, res) => {
  const { productId } = req.query
  const db = getDb()
  let list = db.reviews
  if (productId) list = list.filter((r) => r.productId === productId)
  list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const enriched = list.map((review) => {
    const user = findUserById(review.userId)
    return {
      ...review,
      userName: user?.name ?? 'ผู้ซื้อ',
    }
  })
  res.json({ ok: true, reviews: enriched })
})

router.post('/', requireAuth, (req, res) => {
  const { orderId, productId, rating, comment } = req.body ?? {}
  const score = Number(rating)
  if (!orderId || !productId || !score || score < 1 || score > 5) {
    return res.status(400).json({ ok: false, message: 'กรอกคะแนน 1-5 และระบุออเดอร์/สินค้า' })
  }

  const db = getDb()
  const order = db.orders.find((o) => o.id === orderId)
  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ ok: false, message: 'ไม่พบคำสั่งซื้อ' })
  }
  if (!['to_review', 'completed'].includes(order.status)) {
    return res.status(400).json({ ok: false, message: 'รีวิวได้เมื่อได้รับสินค้าแล้วเท่านั้น' })
  }
  if (!order.items.some((item) => item.productId === productId)) {
    return res.status(400).json({ ok: false, message: 'สินค้าไม่อยู่ในออเดอร์นี้' })
  }
  if (db.reviews.some((r) => r.orderId === orderId && r.productId === productId && r.userId === req.user.id)) {
    return res.status(409).json({ ok: false, message: 'รีวิวสินค้านี้ไปแล้ว' })
  }

  const review = {
    id: createId('rev'),
    orderId,
    productId,
    userId: req.user.id,
    rating: score,
    comment: String(comment || '').trim(),
    createdAt: new Date().toISOString(),
  }
  db.reviews.unshift(review)

  const productReviews = db.reviews.filter((r) => r.productId === productId)
  const product = db.products.find((p) => p.id === productId)
  if (product) {
    product.rating =
      Math.round(
        (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length) * 10,
      ) / 10
  }

  // auto-complete order when all items reviewed
  const allReviewed = order.items.every((item) =>
    db.reviews.some(
      (r) => r.orderId === order.id && r.productId === item.productId && r.userId === req.user.id,
    ),
  )
  if (allReviewed && order.status === 'to_review') {
    order.status = 'completed'
  }

  persist()
  res.status(201).json({ ok: true, review })
})

export default router
