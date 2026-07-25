import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import { Router } from 'express'
import { requireAuth } from '../auth.js'
import { createId } from '../db.js'
import { isDurableUploadConfigured, uploadImageToSupabase } from '../upload-storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '../uploads')

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),
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
  upload.single('image')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ ok: false, message: err.message || 'อัปโหลดไม่สำเร็จ' })
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ ok: false, message: 'กรุณาเลือกไฟล์รูป' })
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg'
    const filename = `${createId('img')}${ext}`

    // Preferred: durable Supabase Storage (survives Render redeploy)
    if (isDurableUploadConfigured()) {
      try {
        const url = await uploadImageToSupabase({
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          filename,
        })
        if (url) {
          return res.status(201).json({
            ok: true,
            url,
            storage: 'supabase',
          })
        }
      } catch (error) {
        // Fall through to local only in non-production; in production surface the error.
        if (process.env.NODE_ENV === 'production') {
          return res.status(502).json({
            ok: false,
            message:
              error instanceof Error
                ? `อัปโหลดถาวรไม่สำเร็จ: ${error.message}`
                : 'อัปโหลดถาวรไม่สำเร็จ',
          })
        }
      }
    }

    // Local disk fallback (dev / when Supabase unset) — ephemeral on Render
    try {
      const dest = path.join(uploadDir, filename)
      fs.writeFileSync(dest, req.file.buffer)
      return res.status(201).json({
        ok: true,
        url: `/uploads/${filename}`,
        storage: 'local',
        warning:
          'บันทึกลงดิสก์เครื่องเซิร์ฟเวอร์ — บน Render อาจหายหลัง redeploy ควรตั้ง Supabase Storage',
      })
    } catch (error) {
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'บันทึกรูปไม่สำเร็จ',
      })
    }
  })
})

export default router
