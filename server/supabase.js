import { createClient } from '@supabase/supabase-js'

let client = null
let lastPersistError = null
let lastPersistAt = null

function env(name) {
  return String(process.env[name] || '').trim().replace(/^["']|["']$/g, '')
}

export function isSupabaseConfigured() {
  return Boolean(env('SUPABASE_URL') && env('SUPABASE_SECRET_KEY'))
}

export function getStorageStatus() {
  const key = env('SUPABASE_SECRET_KEY')
  return {
    configured: isSupabaseConfigured(),
    urlHost: (() => {
      try {
        return new URL(env('SUPABASE_URL')).host
      } catch {
        return null
      }
    })(),
    keyKind: key.startsWith('sb_secret_')
      ? 'secret'
      : key.startsWith('sb_publishable_')
        ? 'publishable'
        : key
          ? 'legacy_or_unknown'
          : 'missing',
    keyPrefix: key ? `${key.slice(0, 12)}…` : null,
    lastPersistAt,
    lastPersistError,
  }
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(env('SUPABASE_URL'), env('SUPABASE_SECRET_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}

export async function fetchAppState() {
  const sb = getSupabaseAdmin()
  if (!sb) return null
  const { data, error } = await sb.from('app_state').select('data').eq('id', 'main').maybeSingle()
  if (error) {
    const msg = error.message || String(error)
    lastPersistError = msg
    if (/relation|does not exist|schema cache/i.test(msg)) {
      const err = new Error(
        'ยังไม่มีตาราง app_state — เปิด Supabase → SQL Editor แล้วรันไฟล์ supabase/schema.sql',
      )
      err.code = 'NO_TABLE'
      throw err
    }
    throw new Error(msg)
  }
  return data?.data ?? null
}

export async function saveAppState(payload) {
  const sb = getSupabaseAdmin()
  if (!sb) return false
  const { error } = await sb.from('app_state').upsert({
    id: 'main',
    data: payload,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    let msg = error.message || String(error)
    if (/row-level security|42501/i.test(msg)) {
      msg =
        'เขียนไม่สำเร็จ: SUPABASE_SECRET_KEY ต้องเป็น sb_secret_... (อย่าใส่ publishable key)'
    }
    if (/Invalid JWT|JWT/i.test(msg)) {
      msg =
        'Invalid JWT — ตรวจว่า SUPABASE_SECRET_KEY เป็น sb_secret_ ของโปรเจกต์นี้ และไม่มีเครื่องหมายคำพูดหุ้ม'
    }
    lastPersistError = msg
    if (/relation|does not exist|schema cache/i.test(msg)) {
      const err = new Error(
        'ยังไม่มีตาราง app_state — เปิด Supabase → SQL Editor แล้วรันไฟล์ supabase/schema.sql',
      )
      err.code = 'NO_TABLE'
      throw err
    }
    throw new Error(msg)
  }
  lastPersistAt = new Date().toISOString()
  lastPersistError = null
  return true
}

/** Public diagnostic used by /api/storage-check */
export async function probeSupabase(samplePayload) {
  const status = getStorageStatus()
  if (!status.configured) {
    return { ok: false, ...status, message: 'missing SUPABASE_URL or SUPABASE_SECRET_KEY' }
  }
  try {
    const existing = await fetchAppState()
    await saveAppState(
      samplePayload && typeof samplePayload === 'object'
        ? samplePayload
        : existing && typeof existing === 'object'
          ? existing
          : { probe: true, at: new Date().toISOString() },
    )
    return {
      ok: true,
      ...getStorageStatus(),
      message: 'read+write ok',
      hadExisting: Boolean(existing && typeof existing === 'object'),
    }
  } catch (err) {
    return {
      ok: false,
      ...getStorageStatus(),
      message: err.message || String(err),
    }
  }
}
