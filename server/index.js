import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { flushPersist, getDb, initDb } from './db.js'
import { assertJwtSecret } from './auth.js'
import { getStorageStatus, probeSupabase } from './supabase.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import shopRoutes from './routes/shops.js'
import orderRoutes from './routes/orders.js'
import voucherRoutes from './routes/vouchers.js'
import addressRoutes from './routes/addresses.js'
import wishlistRoutes from './routes/wishlist.js'
import metaRoutes from './routes/meta.js'
import uploadRoutes from './routes/upload.js'
import reviewRoutes from './routes/reviews.js'
import notificationRoutes from './routes/notifications.js'
import chatRoutes from './routes/chats.js'
import walletRoutes from './routes/wallet.js'
import paymentRoutes from './routes/payments.js'
import returnRoutes from './routes/returns.js'
import helpRoutes from './routes/help.js'
import feedRoutes from './routes/feed.js'
import cartRoutes from './routes/cart.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '../dist')
const uploadsDir = path.resolve(__dirname, 'uploads')
const port = Number(process.env.PORT) || 3000
const isProd = process.env.NODE_ENV === 'production'

assertJwtSecret()
await initDb()

const app = express()
app.disable('x-powered-by')
app.use(cors())
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(uploadsDir))

app.get('/health', (_req, res) => {
  const storage = getStorageStatus()
  res.json({
    ok: true,
    service: 'great-app',
    time: new Date().toISOString(),
    storage: storage.configured ? 'supabase' : 'local',
    supabaseConfigured: storage.configured,
    supabaseKeyKind: storage.keyKind,
    supabaseUrlHost: storage.urlHost,
    supabaseKeyPrefix: storage.keyPrefix,
    lastPersistAt: storage.lastPersistAt,
    lastPersistError: storage.lastPersistError,
  })
})

app.get('/api/storage-check', async (_req, res) => {
  const flushed = await flushPersist()
  const probed = flushed.ok
    ? {
        ok: true,
        ...getStorageStatus(),
        message: 'flush ok',
        users: getDb().users?.length ?? 0,
      }
    : await probeSupabase(getDb())
  res.status(probed.ok ? 200 : 500).json(probed)
})

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/shops', shopRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/vouchers', voucherRoutes)
app.use('/api/addresses', addressRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/returns', returnRoutes)
app.use('/api/help', helpRoutes)
app.use('/api/feed', feedRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api', metaRoutes)

if (isProd) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }))

  // Direct APK download (avoid SPA fallback returning HTML)
  app.get('/downloads/:file', (req, res) => {
    const file = path.basename(String(req.params.file || ''))
    if (!file || file.includes('..')) {
      res.status(400).send('Bad request')
      return
    }
    const candidates = [
      path.join(distDir, 'downloads', file),
      path.join(__dirname, '../public/downloads', file),
    ]
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/vnd.android.package-archive')
        res.setHeader('Content-Disposition', `attachment; filename="${file}"`)
        res.sendFile(filePath)
        return
      }
    }
    res.status(404).send('File not found')
  })

  app.use((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).json({ ok: false, message: 'Method not allowed' })
      return
    }
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/downloads')) {
      res.status(404).json({ ok: false, message: 'Not found' })
      return
    }
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(port, '0.0.0.0', () => {
  const storage = getStorageStatus()
  console.log(`Great App API at http://0.0.0.0:${port}`)
  console.log(
    `Storage: ${storage.configured ? `Supabase (${storage.keyKind})` : 'local db.json'}`,
  )
  if (storage.keyKind === 'publishable') {
    console.error(
      '[supabase] SUPABASE_SECRET_KEY looks like a publishable key — use sb_secret_... instead',
    )
  }
  if (!isProd) {
    console.log(`Demo accounts (dev only):`)
    console.log(`  admin@great.app / (ADMIN_PASSWORD or greatadmin)`)
    console.log(`  seller@great.app / seller123`)
    console.log(`  buyer@great.app / buyer123`)
  } else {
    console.log(`Admin entry: /admin/login (set ADMIN_PASSWORD + JWT_SECRET in env)`)
  }
})
