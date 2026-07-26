import type { Brand } from '../api/types'

export const BRAND_CACHE_KEY = 'great.brandTheme'

/** ค่าเริ่มต้นแบรนด์ DeeJa — ใช้ตอนยังไม่โหลด/ไม่มีแคช (ไม่ใช้ส้ม Shopee) */
export const defaultBrand: Brand = {
  name: 'DeeJa',
  tagline: 'ช้อปง่าย ได้ของดี',
  primaryColor: '#e91e8c',
  secondaryColor: '#ff5cad',
  accentColor: '#ff8fd0',
  logoText: 'DeeJa',
  logoUrl: '',
}

export function applyBrandTheme(brand: Partial<Brand> | null | undefined) {
  const primary = String(brand?.primaryColor || defaultBrand.primaryColor)
  const secondary = String(brand?.secondaryColor || defaultBrand.secondaryColor)
  const accent = String(brand?.accentColor || defaultBrand.accentColor)
  const root = document.documentElement
  root.style.setProperty('--brand', primary)
  root.style.setProperty('--brand-secondary', secondary)
  root.style.setProperty('--brand-accent', accent)
  root.style.setProperty('--brand-dark', primary)
  root.style.setProperty('--danger', primary)
  root.style.setProperty('--brand-grad', `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`)
  root.style.setProperty(
    '--brand-gradient',
    `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, ${accent} 100%)`,
  )
  root.style.setProperty('--brand-soft', `color-mix(in srgb, ${primary} 14%, white)`)
  root.style.setProperty('--brand-soft-strong', `color-mix(in srgb, ${primary} 22%, white)`)

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', primary)

  if (brand?.name) document.title = brand.name
}

export function readCachedBrand(): Brand | null {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Brand>
    if (!parsed?.primaryColor) return null
    return { ...defaultBrand, ...parsed }
  } catch {
    return null
  }
}

export function writeCachedBrand(brand: Brand) {
  try {
    localStorage.setItem(
      BRAND_CACHE_KEY,
      JSON.stringify({
        name: brand.name,
        tagline: brand.tagline,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        accentColor: brand.accentColor,
        logoText: brand.logoText,
        logoUrl: brand.logoUrl || '',
      }),
    )
  } catch {
    /* ignore quota */
  }
}

export function initialBrand(): Brand {
  return readCachedBrand() || defaultBrand
}
