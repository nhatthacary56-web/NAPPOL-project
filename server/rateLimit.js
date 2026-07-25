/**
 * Tiny in-memory IP rate limiter (no external deps).
 * Fine for a single Render instance MVP.
 */
export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = 'ลองใหม่ภายหลัง',
} = {}) {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const hits = new Map()

  function clientKey(req) {
    const xf = req.headers['x-forwarded-for']
    if (typeof xf === 'string' && xf.trim()) {
      return xf.split(',')[0].trim()
    }
    return req.ip || req.socket?.remoteAddress || 'unknown'
  }

  // opportunistic cleanup
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key)
    }
  }, Math.min(windowMs, 60_000)).unref?.()

  return function rateLimit(req, res, next) {
    const key = clientKey(req)
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1
    const remaining = Math.max(0, max - entry.count)
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))
    if (entry.count > max) {
      const retrySec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retrySec))
      return res.status(429).json({
        ok: false,
        message: `${message} (รอประมาณ ${retrySec} วินาที)`,
      })
    }
    next()
  }
}
