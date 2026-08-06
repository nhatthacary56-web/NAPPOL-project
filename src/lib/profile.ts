import type { ApiUser } from '../api/types'

/** ชื่อที่ระบบตั้งให้อัตโนมัติตอน OTP / โซเชียล */
export function isDefaultDisplayName(name?: string | null): boolean {
  const n = String(name || '').trim()
  if (!n) return true
  if (/^ผู้ใช้\s+\d+$/.test(n)) return true
  if (/^(Google|LINE)\s+(User|Buyer)$/i.test(n)) return true
  return false
}

/** ต้องพาไปตั้งโปรไฟล์ก่อนใช้งานแอป */
export function needsProfileOnboarding(user?: ApiUser | null): boolean {
  if (!user || user.role === 'admin') return false
  if (user.profileCompleted) return false
  if (!isDefaultDisplayName(user.name)) return false
  return true
}

export function postLoginPath(user: ApiUser | null | undefined, from = '/account'): string {
  if (needsProfileOnboarding(user)) return '/onboarding'
  return from || '/account'
}
