import { getDb } from './db.js'

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function defaultPrivacy() {
  return (
    getDb().appContent?.legal?.privacy ||
    'เราเก็บข้อมูลที่จำเป็นต่อการสั่งซื้อและการให้บริการเท่านั้น และไม่ขายข้อมูลส่วนบุคคลแก่บุคคลภายนอกโดยไม่ได้รับความยินยอม คุณลบบัญชีได้ที่ การตั้งค่า → ลบบัญชี'
  )
}

/** HTML สำหรับ Play Store / ลิงก์ภายนอก — sync กับข้อความที่แอดมินแก้ใน เนื้อหาแอป → นโยบาย */
export function renderPrivacyHtml() {
  const body = escapeHtml(defaultPrivacy())
  const updated = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return `<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>นโยบายความเป็นส่วนตัว — DeeJa</title>
    <style>
      body { margin: 0; font-family: "Noto Sans Thai", "Sarabun", sans-serif; background: #faf7f9; color: #1f2937; line-height: 1.65; }
      main { max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
      h1 { color: #e91e8c; font-size: 1.75rem; margin: 0 0 8px; }
      .updated { color: #6b7280; font-size: 0.9rem; margin-bottom: 28px; }
      .body { white-space: pre-wrap; font-size: 0.98rem; background: #fff; border: 1px solid #f3d6e6; border-radius: 12px; padding: 18px 20px; }
      a { color: #c2185b; }
      .note { margin-top: 24px; font-size: 0.9rem; color: #6b7280; }
    </style>
  </head>
  <body>
    <main>
      <h1>นโยบายความเป็นส่วนตัว — DeeJa</h1>
      <p class="updated">อัปเดตจากหลังบ้านแอดมิน · ${updated}</p>
      <div class="body">${body}</div>
      <p class="note">
        หน้าในแอป:
        <a href="/privacy">/privacy</a>
        · แก้ไขข้อความได้ที่ Admin → เนื้อหาแอป → นโยบาย
      </p>
    </main>
  </body>
</html>`
}
