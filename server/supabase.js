import { createClient } from '@supabase/supabase-js'

let client = null

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY)
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
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
    const msg = error.message || String(error)
    if (/relation|does not exist|schema cache/i.test(msg)) {
      const err = new Error(
        'ยังไม่มีตาราง app_state — เปิด Supabase → SQL Editor แล้วรันไฟล์ supabase/schema.sql',
      )
      err.code = 'NO_TABLE'
      throw err
    }
    throw new Error(msg)
  }
  return true
}
