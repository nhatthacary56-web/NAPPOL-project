import { Router } from 'express'
import { createId, getDb, persist } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const list = getDb().addresses.filter((a) => a.userId === req.user.id)
  res.json({ ok: true, addresses: list })
})

router.post('/', requireAuth, (req, res) => {
  const {
    name,
    phone,
    line1,
    line2,
    district,
    subdistrict,
    province,
    postalCode,
    addressType,
    isDefault,
  } = req.body ?? {}
  if (!name || !phone || !line1 || !district || !province || !postalCode) {
    return res.status(400).json({ ok: false, message: 'กรอกที่อยู่ให้ครบ' })
  }
  const db = getDb()
  const mine = db.addresses.filter((a) => a.userId === req.user.id)
  const type =
    addressType === 'office' || addressType === 'other' || addressType === 'home'
      ? addressType
      : 'home'
  const address = {
    id: createId('addr'),
    userId: req.user.id,
    name: name.trim(),
    phone: phone.trim(),
    line1: line1.trim(),
    line2: String(line2 || '').trim(),
    district: district.trim(),
    subdistrict: String(subdistrict || '').trim(),
    province: province.trim(),
    postalCode: postalCode.trim(),
    addressType: type,
    isDefault: Boolean(isDefault) || mine.length === 0,
  }
  if (address.isDefault) {
    for (const a of mine) a.isDefault = false
  }
  db.addresses.push(address)
  persist()
  res.status(201).json({ ok: true, address })
})

router.patch('/:id/default', requireAuth, (req, res) => {
  const db = getDb()
  const address = db.addresses.find((a) => a.id === req.params.id && a.userId === req.user.id)
  if (!address) return res.status(404).json({ ok: false, message: 'ไม่พบที่อยู่' })
  for (const a of db.addresses.filter((x) => x.userId === req.user.id)) {
    a.isDefault = a.id === address.id
  }
  persist()
  res.json({ ok: true, address })
})

router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb()
  const idx = db.addresses.findIndex((a) => a.id === req.params.id && a.userId === req.user.id)
  if (idx < 0) return res.status(404).json({ ok: false, message: 'ไม่พบที่อยู่' })
  const wasDefault = db.addresses[idx].isDefault
  db.addresses.splice(idx, 1)
  if (wasDefault) {
    const first = db.addresses.find((a) => a.userId === req.user.id)
    if (first) first.isDefault = true
  }
  persist()
  res.json({ ok: true })
})

export default router
