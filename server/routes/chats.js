import { Router } from 'express'
import { createId, getDb, getShopById, getShopByOwner, persist, pushNotification } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

function chatUnread(chat, userId) {
  const lastRead = chat.lastRead?.[userId] || ''
  return (chat.messages || []).filter((m) => m.senderId !== userId && m.createdAt > lastRead).length
}

function summarizeChat(chat, userId) {
  const db = getDb()
  const shop = getShopById(chat.shopId)
  const buyer = db.users.find((u) => u.id === chat.buyerId)
  const last = chat.messages?.[chat.messages.length - 1]
  return {
    id: chat.id,
    shopId: chat.shopId,
    shopName: shop?.name || 'ร้านค้า',
    buyerId: chat.buyerId,
    buyerName: buyer?.name || 'ลูกค้า',
    productId: chat.productId || null,
    orderId: chat.orderId || null,
    updatedAt: chat.updatedAt,
    lastMessage: last
      ? { body: last.body, senderId: last.senderId, createdAt: last.createdAt }
      : null,
    unread: chatUnread(chat, userId),
  }
}

function canAccess(chat, user) {
  if (user.role === 'admin') return true
  if (chat.buyerId === user.id) return true
  if (user.role === 'seller') {
    const shop = getShopByOwner(user.id)
    return shop && shop.id === chat.shopId
  }
  return false
}

router.get('/unread-count', requireAuth, (req, res) => {
  const db = getDb()
  let chats = []
  if (req.user.role === 'admin') {
    chats = db.chats
  } else if (req.user.role === 'seller') {
    const shop = getShopByOwner(req.user.id)
    chats = shop
      ? db.chats.filter((c) => c.shopId === shop.id || c.buyerId === req.user.id)
      : db.chats.filter((c) => c.buyerId === req.user.id)
  } else {
    chats = db.chats.filter((c) => c.buyerId === req.user.id)
  }
  const count = chats.reduce((s, c) => s + chatUnread(c, req.user.id), 0)
  res.json({ ok: true, count })
})

router.get('/', requireAuth, (req, res) => {
  const db = getDb()
  let chats = []
  if (req.user.role === 'admin') {
    chats = [...db.chats]
  } else if (req.user.role === 'seller') {
    const shop = getShopByOwner(req.user.id)
    chats = db.chats.filter(
      (c) => c.buyerId === req.user.id || (shop && c.shopId === shop.id),
    )
  } else {
    chats = db.chats.filter((c) => c.buyerId === req.user.id)
  }
  chats.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  res.json({
    ok: true,
    chats: chats.map((c) => summarizeChat(c, req.user.id)),
  })
})

router.post('/', requireAuth, (req, res) => {
  const db = getDb()
  const { shopId, productId, orderId, message } = req.body ?? {}
  if (!shopId) return res.status(400).json({ ok: false, message: 'ต้องระบุร้าน' })

  const shop = getShopById(shopId)
  if (!shop || shop.status !== 'active') {
    return res.status(400).json({ ok: false, message: 'ร้านไม่พร้อมแชท' })
  }

  let buyerId = req.user.id
  if (req.user.role === 'seller') {
    const myShop = getShopByOwner(req.user.id)
    if (myShop?.id === shopId) {
      return res.status(400).json({ ok: false, message: 'ไม่สามารถแชทกับร้านตัวเองได้' })
    }
  }

  if (orderId) {
    const order = db.orders.find((o) => o.id === orderId)
    if (order) buyerId = order.userId
  }

  let chat = db.chats.find((c) => c.shopId === shopId && c.buyerId === buyerId)
  if (!chat) {
    chat = {
      id: createId('chat'),
      shopId,
      buyerId,
      productId: productId || null,
      orderId: orderId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRead: {},
      messages: [],
    }
    db.chats.unshift(chat)
  } else {
    if (productId) chat.productId = productId
    if (orderId) chat.orderId = orderId
  }

  if (message && String(message).trim()) {
    const body = String(message).trim().slice(0, 1000)
    chat.messages.push({
      id: createId('msg'),
      senderId: req.user.id,
      body,
      createdAt: new Date().toISOString(),
    })
    chat.updatedAt = new Date().toISOString()
    const notifyId = req.user.id === buyerId ? shop.ownerId : buyerId
    pushNotification(notifyId, {
      type: 'chat',
      title: 'ข้อความใหม่',
      body: body.slice(0, 80),
      link: `/chats/${chat.id}`,
    })
  }

  persist()
  res.status(201).json({ ok: true, chat: summarizeChat(chat, req.user.id), chatId: chat.id })
})

router.get('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const chat = db.chats.find((c) => c.id === req.params.id)
  if (!chat) return res.status(404).json({ ok: false, message: 'ไม่พบแชท' })
  if (!canAccess(chat, req.user)) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  const shop = getShopById(chat.shopId)
  const buyer = db.users.find((u) => u.id === chat.buyerId)
  const product = chat.productId ? db.products.find((p) => p.id === chat.productId) : null

  res.json({
    ok: true,
    chat: {
      ...summarizeChat(chat, req.user.id),
      shopOwnerId: shop?.ownerId,
      messages: chat.messages || [],
      product: product
        ? { id: product.id, name: product.name, image: product.image, price: product.price }
        : null,
    },
  })
})

router.post('/:id/messages', requireAuth, (req, res) => {
  const db = getDb()
  const chat = db.chats.find((c) => c.id === req.params.id)
  if (!chat) return res.status(404).json({ ok: false, message: 'ไม่พบแชท' })
  if (!canAccess(chat, req.user)) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  const body = String(req.body?.body || '').trim().slice(0, 1000)
  if (!body) return res.status(400).json({ ok: false, message: 'พิมพ์ข้อความก่อนส่ง' })

  const msg = {
    id: createId('msg'),
    senderId: req.user.id,
    body,
    createdAt: new Date().toISOString(),
  }
  chat.messages.push(msg)
  chat.updatedAt = msg.createdAt
  chat.lastRead = { ...(chat.lastRead || {}), [req.user.id]: msg.createdAt }

  const shop = getShopById(chat.shopId)
  const notifyId = req.user.id === chat.buyerId ? shop?.ownerId : chat.buyerId
  if (notifyId) {
    pushNotification(notifyId, {
      type: 'chat',
      title: 'ข้อความใหม่',
      body: body.slice(0, 80),
      link: `/chats/${chat.id}`,
    })
  }

  persist()
  res.status(201).json({ ok: true, message: msg })
})

router.patch('/:id/read', requireAuth, (req, res) => {
  const db = getDb()
  const chat = db.chats.find((c) => c.id === req.params.id)
  if (!chat) return res.status(404).json({ ok: false, message: 'ไม่พบแชท' })
  if (!canAccess(chat, req.user)) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  chat.lastRead = {
    ...(chat.lastRead || {}),
    [req.user.id]: new Date().toISOString(),
  }
  persist()
  res.json({ ok: true })
})

export default router
