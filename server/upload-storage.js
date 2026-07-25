import { getSupabaseAdmin, isSupabaseConfigured } from './supabase.js'

const BUCKET = process.env.SUPABASE_UPLOAD_BUCKET || 'app-uploads'

let bucketReady = false

async function ensureBucket(sb) {
  if (bucketReady) return true
  const { data: buckets, error: listErr } = await sb.storage.listBuckets()
  if (listErr) throw new Error(listErr.message || 'listBuckets failed')
  const exists = (buckets || []).some((b) => b.name === BUCKET)
  if (!exists) {
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })
    if (error && !/already exists/i.test(error.message || '')) {
      throw new Error(error.message || 'createBucket failed')
    }
  }
  bucketReady = true
  return true
}

/**
 * Upload image bytes to Supabase Storage (durable).
 * Returns public HTTPS URL or null if Supabase not configured.
 */
export async function uploadImageToSupabase({ buffer, contentType, filename }) {
  if (!isSupabaseConfigured()) return null
  const sb = getSupabaseAdmin()
  if (!sb) return null

  await ensureBucket(sb)
  const safeName = String(filename || 'image.jpg').replace(/[^\w.\-]+/g, '_')
  const path = `images/${Date.now()}_${safeName}`

  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentType || 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message || 'อัปโหลดขึ้น Supabase ไม่สำเร็จ')

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('ได้ URL รูปจาก Supabase ไม่สำเร็จ')
  return data.publicUrl
}

export function isDurableUploadConfigured() {
  return isSupabaseConfigured()
}
