# DeeJa — ไฟล์พร้อมอัปโหลด Play Internal Testing

## สิ่งที่เตรียมให้แล้วในโฟลเดอร์นี้

| ไฟล์ | ใช้ทำอะไร |
|------|-----------|
| `icon-512.png` | ไอคอนความละเอียดสูงใน Play Console |
| `feature-graphic-1024x500.png` | Feature graphic |
| `screenshots/*.png` | ภาพหน้าจอโทรศัพท์ (ถ่ายจากเว็บมือถือ) |
| `listing-th.txt` | ชื่อ/คำอธิบายภาษาไทย คัดลอกใส่ Console |

## AAB + Keystore (บนเครื่องคุณ — ไม่ขึ้น Git)

- Keystore: `android/keystore/deeja-upload.jks`
- รหัส: ดู `android/keystore/CREDENTIALS.local.txt`
- AAB หลัง build: `android/app/build/outputs/bundle/release/app-release.aab`

## สิ่งที่ต้องทำเอง (ผูกบัญชี Google ของคุณ — ทำแทนไม่ได้)

1. เปิด https://play.google.com/console จ่ายค่าลงทะเบียนครั้งเดียว (ถ้ายังไม่เคย)
2. สร้างแอปชื่อ **DeeJa**
3. ใส่ Privacy policy: `https://nappol-project.onrender.com/privacy`
4. อัปโหลดไอคอน / feature graphic / screenshots จากโฟลเดอร์นี้
5. Testing → Internal testing → อัปโหลด `.aab` → เพิ่มอีเมลเทสเตอร์

รายละเอียดเต็ม: `docs/PLAY_INTERNAL_TESTING.md`
