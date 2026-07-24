import jwt from 'jsonwebtoken'
import { findUserById, publicUser } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'great-app-dev-secret-change-me'

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' },
  )
}

export function authOptional(req, _res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    req.user = null
    return next()
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    const user = findUserById(payload.sub)
    req.user = user ? publicUser(user) : null
  } catch {
    req.user = null
  }
  next()
}

export function requireAuth(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({ ok: false, message: 'กรุณาเข้าสู่ระบบ' })
      return
    }
    next()
  })
}

export function requireRole(...roles) {
  return (req, res, next) => {
    requireAuth(req, res, () => {
      if (!roles.includes(req.user.role)) {
        res.status(403).json({ ok: false, message: 'ไม่มีสิทธิ์เข้าถึง' })
        return
      }
      next()
    })
  }
}
