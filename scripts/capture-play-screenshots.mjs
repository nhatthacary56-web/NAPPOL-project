/**
 * Capture Play Store phone screenshots from the live DeeJa site.
 * Usage: node scripts/capture-play-screenshots.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE = process.env.PLAY_SHOT_URL || 'https://nappol-project.onrender.com'
const OUT = path.resolve('store/play/screenshots')

const shots = [
  { name: '01-home', path: '/' },
  { name: '02-mall', path: '/mall' },
  { name: '03-product', path: '/mall' }, // refined after click if possible
  { name: '04-privacy', path: '/privacy' },
  { name: '05-login', path: '/login' },
]

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  locale: 'th-TH',
})
const page = await context.newPage()

for (const shot of shots) {
  const url = `${BASE}${shot.path}`
  console.log('shot', url)
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 })
    await page.waitForTimeout(1500)

    if (shot.name === '03-product') {
      const link = page.locator('a[href*="/product/"]').first()
      if (await link.count()) {
        await link.click({ timeout: 5000 }).catch(() => {})
        await page.waitForTimeout(2000)
      }
    }

    const file = path.join(OUT, `${shot.name}.png`)
    await page.screenshot({ path: file, fullPage: false })
    console.log('saved', file)
  } catch (err) {
    console.error('failed', shot.name, err.message)
  }
}

await browser.close()
console.log('done →', OUT)
