import { Router } from 'express'
import {
  createId,
  getDb,
  getShopById,
  getShopByOwner,
  persist,
  pushNotification,
  reverseShopPending,
  getWallet,
} from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const router = Router()

router.get('/mine', requireAuth, (req, res) => {
  const db = getDb()
  const list = (db.returns || [])
    .filter((r) => r.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ ok: true, returns: list })
})

router.get('/seller', requireAuth, (req, res) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  const db = getDb()
  const shop = getShopByOwner(req.user.id)
  let list = db.returns || []
  if (req.user.role === 'seller') {
    if (!shop) return res.json({ ok: true, returns: [] })
    list = list.filter((r) => r.shopId === shop.id)
  }
  list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json({ ok: true, returns: list })
})

router.get('/admin', requireRole('admin'), (_req, res) => {
  const list = [...(getDb().returns || [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  res.json({ ok: true, returns: list })
})

router.post('/', requireAuth, (req, res) => {
  const db = getDb()
  const { orderId, reason, itemProductIds } = req.body ?? {}
  const order = db.orders.find((o) => o.id === orderId)
  if (!order) return res.status(404).json({ ok: false, message: 'ไม่พบออเดอร์' })
  if (order.userId !== req.user.id) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  if (!['to_review', 'completed', 'shipping'].includes(order.status)) {
    return res.status(400).json({
      ok: false,
      message: 'ขอคืนได้เมื่อออเดอร์จัดส่งแล้วหรือรับของแล้ว',
    })
  }
  if ((db.returns || []).some((r) => r.orderId === orderId && r.status !== 'rejected')) {
    return res.status(400).json({ ok: false, message: 'มีคำขอคืนของออเดอร์นี้อยู่แล้ว' })
  }

  const shopId = order.items[0]?.shopId
  const shop = getShopById(shopId)
  const productIds = Array.isArray(itemProductIds)
    ? itemProductIds
    : order.items.map((i) => i.productId)
  const items = order.items.filter((i) => productIds.includes(i.productId))
  const amount = items.reduce((s, i) => s + i.price * i.qty, 0)

  const ret = {
    id: createId('ret'),
    orderId: order.id,
    userId: req.user.id,
    shopId,
    shopName: shop?.name,
    reason: String(reason || '').trim() || 'ต้องการคืนสินค้า',
    items,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    processedAt: null,
    adminNote: '',
  }
  if (!db.returns) db.returns = []
  db.returns.unshift(ret)
  order.returnId = ret.id

  if (shop) {
    pushNotification(shop.ownerId, {
      type: 'return',
      title: 'มีคำขอคืนสินค้า',
      body: `ออเดอร์ ${order.id} · ฿${amount.toLocaleString('th-TH')}`,
    })
  }
  const admins = db.users.filter((u) => u.role === 'admin')
  for (const admin of admins) {
    pushNotification(admin.id, {
      type: 'return',
      title: 'คำขอคืนสินค้าใหม่',
      body: `ออเดอร์ ${order.id}`,
    })
  }

  persist()
  res.status(201).json({ ok: true, return: ret })
})

router.patch('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const ret = (db.returns || []).find((r) => r.id === req.params.id)
  if (!ret) return res.status(404).json({ ok: false, message: 'ไม่พบคำขอ' })

  const shop = getShopByOwner(req.user.id)
  const isSeller = shop && shop.id === ret.shopId
  const isAdmin = req.user.role === 'admin'
  if (!isAdmin && !isSeller) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  const { status, note } = req.body ?? {}
  if (!['approved', 'rejected', 'refunded'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
  }
  if (ret.status !== 'pending' && !(ret.status === 'approved' && status === 'refunded')) {
    return res.status(400).json({ ok: false, message: 'อัปเดตสถานะนี้ไม่ได้' })
  }

  ret.status = status
  ret.processedAt = new Date().toISOString()
  if (note) ret.adminNote = String(note).trim()

  const order = db.orders.find((o) => o.id === ret.orderId)

  if (status === 'approved' || status === 'refunded') {
    if (order && order.status !== 'refunded') {
      // reverse pending if still pending; deduct balance if released
      const settlement = order.settlements?.[ret.shopId]
      if (settlement) {
        if (settlement.status === 'pending') {
          reverseShopPending(ret.shopId, settlement.net)
          settlement.status = 'reversed'
        } else if (settlement.status === 'released') {
          const wallet = getWallet(ret.shopId)
          wallet.balance = Math.max(0, wallet.balance - settlement.net)
          wallet.totalEarned = Math.max(0, wallet.totalEarned - settlement.net)
          settlement.status = 'reversed'
        }
      }
      order.status = 'refunded'
      // restore stock for returned items
      for (const item of ret.items) {
        const product = db.products.find((p) => p.id === item.productId)
        if (product) {
          product.stock = (product.stock || 0) + item.qty
          product.sold = Math.max(0, (product.sold || 0) - item.qty)
        }
      }
    }
    ret.status = 'refunded'
  }

  pushNotification(ret.userId, {
    type: 'return',
    title:
      status === 'rejected'
        ? 'คำขอคืนสินค้าถูกปฏิเสธ'
        : 'อนุมัติคืนสินค้า / คืนเงินแล้ว',
    body: `ออเดอร์ ${ret.orderId}`,
  })

  persist()
  res.json({ ok: true, return: ret, order })
})

export default router
