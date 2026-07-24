import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { createId } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../uploads')

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg'
    cb(null, `${createId('img')}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('อัปโหลดได้เฉพาะไฟล์รูปภาพ'))
      return
    }
    cb(null, true)
  },
})

const router = Router()

router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ ok: false, message: err.message || 'อัปโหลดไม่สำเร็จ' })
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'กรุณาเลือกไฟล์รูป' })
    }
    const url = `/uploads/${req.file.filename}`
    res.status(201).json({ ok: true, url })
  })
})

export default router
