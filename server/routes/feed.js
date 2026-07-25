import { Router } from 'express'
import { createId, enrichProduct, getDb, persist } from '../db.js'
import { authOptional, requireAuth, requireRole } from '../auth.js'

const router = Router()

function publicUser(user) {
  if (!user) return { userName: 'ผู้ใช้', userRole: 'buyer' }
  return {
    userName: user.name || 'ผู้ใช้',
    userRole: user.role || 'buyer',
  }
}

function enrichPost(post, viewerId) {
  const db = getDb()
  const products = (post.productIds || [])
    .map((id) => db.products.find((p) => p.id === id && p.status === 'active'))
    .filter(Boolean)
    .map(enrichProduct)
  const likedBy = Array.isArray(post.likedBy) ? post.likedBy : []
  return {
    ...post,
    likeCount: likedBy.length,
    liked: viewerId ? likedBy.includes(viewerId) : false,
    products,
    likedBy: undefined,
  }
}

function ensureFeed() {
  const db = getDb()
  if (!Array.isArray(db.feedPosts)) db.feedPosts = []
  return db.feedPosts
}

/** ฟีดสาธารณะ — เฉพาะโพสต์ที่อนุมัติแล้ว */
router.get('/', authOptional, (req, res) => {
  const list = ensureFeed()
    .filter((p) => p.status === 'active')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const viewerId = req.user?.id
  res.json({ ok: true, posts: list.map((p) => enrichPost(p, viewerId)) })
})

/** แอดมินดูทุกสถานะ */
router.get('/admin', requireRole('admin'), (req, res) => {
  const { status } = req.query
  let list = [...ensureFeed()]
  if (status && ['pending', 'active', 'hidden'].includes(String(status))) {
    list = list.filter((p) => p.status === status)
  }
  list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  res.json({
    ok: true,
    posts: list.map((p) => enrichPost(p, req.user.id)),
  })
})

router.post('/', requireAuth, (req, res) => {
  const { image, caption, productIds } = req.body ?? {}
  const img = String(image || '').trim()
  const text = String(caption || '').trim()
  if (!img) return res.status(400).json({ ok: false, message: 'ต้องมีรูปภาพ' })
  if (!text) return res.status(400).json({ ok: false, message: 'กรอกคำบรรยาย' })
  if (text.length > 2000) {
    return res.status(400).json({ ok: false, message: 'คำบรรยายยาวเกิน 2000 ตัวอักษร' })
  }

  const db = getDb()
  const ids = Array.isArray(productIds)
    ? [...new Set(productIds.map((id) => String(id)).filter(Boolean))].slice(0, 5)
    : []
  for (const id of ids) {
    const product = db.products.find((p) => p.id === id && p.status === 'active')
    if (!product) {
      return res.status(400).json({ ok: false, message: `ไม่พบสินค้า ${id}` })
    }
  }

  const user = db.users.find((u) => u.id === req.user.id)
  const isAdmin = req.user.role === 'admin'
  const now = new Date().toISOString()
  const post = {
    id: createId('feed'),
    userId: req.user.id,
    ...publicUser(user),
    image: img,
    caption: text,
    productIds: ids,
    status: isAdmin ? 'active' : 'pending',
    likedBy: [],
    createdAt: now,
    updatedAt: now,
  }
  ensureFeed().unshift(post)
  persist()
  res.status(201).json({
    ok: true,
    post: enrichPost(post, req.user.id),
    message: isAdmin
      ? 'โพสต์เผยแพร่แล้ว'
      : 'ส่งโพสต์แล้ว รอแอดมินอนุมัติก่อนขึ้นฟีด',
  })
})

router.post('/:id/like', requireAuth, (req, res) => {
  const post = ensureFeed().find((p) => p.id === req.params.id)
  if (!post || post.status !== 'active') {
    return res.status(404).json({ ok: false, message: 'ไม่พบโพสต์' })
  }
  if (!Array.isArray(post.likedBy)) post.likedBy = []
  const uid = req.user.id
  const idx = post.likedBy.indexOf(uid)
  if (idx >= 0) post.likedBy.splice(idx, 1)
  else post.likedBy.push(uid)
  post.updatedAt = new Date().toISOString()
  persist()
  res.json({ ok: true, post: enrichPost(post, uid) })
})

router.patch('/:id', requireAuth, (req, res) => {
  const post = ensureFeed().find((p) => p.id === req.params.id)
  if (!post) return res.status(404).json({ ok: false, message: 'ไม่พบโพสต์' })

  const isAdmin = req.user.role === 'admin'
  const isOwner = post.userId === req.user.id
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }

  if (req.body?.caption !== undefined) {
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
    }
    const text = String(req.body.caption || '').trim()
    if (!text) return res.status(400).json({ ok: false, message: 'กรอกคำบรรยาย' })
    if (text.length > 2000) {
      return res.status(400).json({ ok: false, message: 'คำบรรยายยาวเกิน 2000 ตัวอักษร' })
    }
    post.caption = text
  }

  if (req.body?.image !== undefined && (isAdmin || isOwner)) {
    const img = String(req.body.image || '').trim()
    if (!img) return res.status(400).json({ ok: false, message: 'ต้องมีรูปภาพ' })
    post.image = img
  }

  if (req.body?.productIds !== undefined && (isAdmin || isOwner)) {
    const db = getDb()
    const ids = Array.isArray(req.body.productIds)
      ? [...new Set(req.body.productIds.map((id) => String(id)).filter(Boolean))].slice(0, 5)
      : []
    for (const id of ids) {
      if (!db.products.some((p) => p.id === id && p.status === 'active')) {
        return res.status(400).json({ ok: false, message: `ไม่พบสินค้า ${id}` })
      }
    }
    post.productIds = ids
  }

  if (req.body?.status !== undefined) {
    if (!isAdmin) {
      return res.status(403).json({ ok: false, message: 'เปลี่ยนสถานะได้เฉพาะแอดมิน' })
    }
    if (!['pending', 'active', 'hidden'].includes(req.body.status)) {
      return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
    }
    post.status = req.body.status
  }

  post.updatedAt = new Date().toISOString()
  persist()
  res.json({ ok: true, post: enrichPost(post, req.user.id) })
})

router.delete('/:id', requireAuth, (req, res) => {
  const list = ensureFeed()
  const idx = list.findIndex((p) => p.id === req.params.id)
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบโพสต์' })
  const post = list[idx]
  const isAdmin = req.user.role === 'admin'
  const isOwner = post.userId === req.user.id
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์' })
  }
  list.splice(idx, 1)
  persist()
  res.json({ ok: true })
})

export default router
