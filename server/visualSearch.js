import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'
import { getDb, persist } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadsDir = path.join(__dirname, 'uploads')

const CATEGORY_COLORS = {
  fashion: { r: 230, g: 120, b: 140 },
  beauty: { r: 240, g: 160, b: 190 },
  electronics: { r: 80, g: 120, b: 180 },
  home: { r: 140, g: 180, b: 140 },
  food: { r: 220, g: 150, b: 80 },
  mom: { r: 190, g: 170, b: 230 },
  sports: { r: 60, g: 170, b: 150 },
  pets: { r: 200, g: 150, b: 100 },
  books: { r: 120, g: 140, b: 200 },
  vouchers: { r: 230, g: 100, b: 100 },
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function colorDistance(a, b) {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b
  // Weighted RGB distance (cheap perceptual approx)
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db)
}

function averageFromRgba(data, width, height, step = 8) {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  const rowStride = width * 4
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = y * rowStride + x * 4
      const alpha = data[i + 3]
      if (alpha < 128) continue
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      n += 1
    }
  }
  if (!n) return { r: 128, g: 128, b: 128 }
  return { r: clampByte(r / n), g: clampByte(g / n), b: clampByte(b / n) }
}

export function extractColorFromBuffer(buffer, mimeHint = '') {
  const mime = String(mimeHint || '').toLowerCase()
  const isPng =
    mime.includes('png') ||
    (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
  const isJpeg =
    mime.includes('jpeg') ||
    mime.includes('jpg') ||
    (buffer[0] === 0xff && buffer[1] === 0xd8)

  if (isPng) {
    const png = PNG.sync.read(buffer)
    return averageFromRgba(png.data, png.width, png.height)
  }
  if (isJpeg) {
    const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 64 })
    return averageFromRgba(decoded.data, decoded.width, decoded.height)
  }

  // Try JPEG then PNG as last resort
  try {
    const decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 64 })
    return averageFromRgba(decoded.data, decoded.width, decoded.height)
  } catch {
    const png = PNG.sync.read(buffer)
    return averageFromRgba(png.data, png.width, png.height)
  }
}

export async function loadImageBuffer(imageUrl) {
  if (!imageUrl) return null
  const url = String(imageUrl)
  if (url.startsWith('/uploads/')) {
    const file = path.join(uploadsDir, path.basename(url))
    if (!fs.existsSync(file)) return null
    return fs.readFileSync(file)
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const ab = await res.arrayBuffer()
    return Buffer.from(ab)
  }
  return null
}

export async function extractColorFromImageUrl(imageUrl, mimeHint = '') {
  const buf = await loadImageBuffer(imageUrl)
  if (!buf) return null
  return extractColorFromBuffer(buf, mimeHint)
}

export async function ensureProductVisualColor(product, { markDirty } = {}) {
  if (product.visualColor?.r != null) return product.visualColor
  try {
    const color = await extractColorFromImageUrl(product.image)
    if (color) {
      product.visualColor = color
      if (typeof markDirty === 'function') markDirty()
      return color
    }
  } catch {
    // fall through
  }
  const fallback = CATEGORY_COLORS[product.categorySlug] || { r: 160, g: 160, b: 160 }
  product.visualColor = fallback
  if (typeof markDirty === 'function') markDirty()
  return fallback
}

function guessCategoryFromColor(color) {
  let best = null
  let bestDist = Infinity
  for (const [slug, c] of Object.entries(CATEGORY_COLORS)) {
    const d = colorDistance(color, c)
    if (d < bestDist) {
      bestDist = d
      best = slug
    }
  }
  return best
}

/**
 * Rank active products by visual similarity to a query color.
 */
export async function matchProductsByColor(queryColor, { excludeId, limit = 24 } = {}) {
  const db = getDb()
  const active = db.products.filter((p) => {
    if (p.status !== 'active') return false
    if (excludeId && p.id === excludeId) return false
    return true
  })

  const guessedCategory = guessCategoryFromColor(queryColor)
  const scored = []
  let dirty = false
  const markDirty = () => {
    dirty = true
  }

  // Limit first-pass fingerprint work so search stays snappy on cold cache
  const sample = active.slice(0, 80)
  for (const product of sample) {
    const color = await ensureProductVisualColor(product, { markDirty })
    const dist = colorDistance(queryColor, color)
    let score = Math.max(0, 100 - dist / 2.2)
    if (product.categorySlug === guessedCategory) score += 12
    if (product.flashSale) score += 2
    scored.push({ product, score, dist, color })
  }
  if (dirty) persist()

  scored.sort((a, b) => b.score - a.score || a.dist - b.dist)
  const top = scored.slice(0, limit)
  const best = top[0]
  const exactish = Boolean(best && best.score >= 78)

  return {
    queryColor,
    guessedCategory,
    exactish,
    matches: top,
  }
}
