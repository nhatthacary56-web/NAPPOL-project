const TOKEN_KEY = 'great.token'

/** Empty in web/dev (same-origin). Set VITE_API_BASE_URL for embedded Capacitor builds. */
export function apiBase(): string {
  return String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = apiBase()
  return base ? `${base}${p}` : p
}

/** Absolute or same-origin media URL (uploads / external). */
export function mediaUrl(url?: string | null): string {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  return apiUrl(raw.startsWith('/') ? raw : `/${raw}`)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const endpoint = path.startsWith('/api') ? path : `/api${path}`
  const res = await fetch(apiUrl(endpoint), {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.message || 'เกิดข้อผิดพลาด', res.status)
  }
  return data as T
}
