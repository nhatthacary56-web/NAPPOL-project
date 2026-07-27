# คู่มืออัปโหลด Play — สิ่งที่เหลือทำด้วยมือ (บัญชี Google ของคุณ)

ผมทำให้ครบแล้วในเครื่องนี้เกือบทั้งหมด เหลือแค่ขั้นตอนที่ต้องล็อกอิน Google Play Console ด้วยบัญชีของคุณ

## ไฟล์สำคัญบนเครื่อง

| สิ่งของ | ที่อยู่ |
|--------|--------|
| AAB (อัปโหลด Play) | เลือกอย่างใดอย่างหนึ่ง:
- `android/app/build/outputs/bundle/release/app-release.aab`
- `store/play/releases/DeeJa-0.1.0-release.aab` |
| Keystore | `android/keystore/deeja-upload.jks` |
| รหัส keystore | `android/keystore/CREDENTIALS.local.txt` |
| ไอคอน 512 | `store/play/icon-512.png` |
| Feature graphic | `store/play/feature-graphic-1024x500.png` |
| ภาพหน้าจอ | `store/play/screenshots/` |
| คำอธิบายแอป | `store/play/listing-th.txt` |
| Privacy policy | https://nappol-project.onrender.com/privacy |

**สำคัญมาก:** สำรองไฟล์ `.jks` + `CREDENTIALS.local.txt` ไว้ที่ปลอดภัย ถ้าหายจะอัปเดตแอปเดิมบน Play ไม่ได้

## ขั้นตอนใน Play Console (ประมาณ 15–20 นาที)

1. เปิด https://play.google.com/console
2. ถ้ายังไม่เคยสมัครนักพัฒนา → จ่ายค่าลงทะเบียนครั้งเดียว (~$25)
3. **Create app** → ชื่อ `DeeJa` → ภาษาไทย → แอป → ฟรี
4. ตั้งค่าเริ่มต้น (Dashboard checklist):
   - Privacy policy = `https://nappol-project.onrender.com/privacy`
   - App access / Data safety: ระบุว่ามีการลบบัญชีในแอป (ตั้งค่า → ลบบัญชี)
   - อัปโหลดไอคอน + feature graphic + screenshots จาก `store/play/`
   - คัดลอกข้อความจาก `listing-th.txt`
5. **Testing → Internal testing → Create new release**
6. อัปโหลด `app-release.aab`
7. เพิ่มอีเมล Gmail ของเทสเตอร์ → ส่งลิงก์เข้าร่วม

ยังไม่ต้องกด Production

## Render (แนะนำก่อนแจกเทสเตอร์)

ใน Environment ของ Render ตั้ง:

```
AUTH_DEMO_OTP=0
AUTH_DEMO_SOCIAL=0
JWT_SECRET=<สุ่มยาวๆ>
```

(ถ้ายังไม่ได้ตั้ง Google/LINE จริง เทสด้วยอีเมล/รหัสผ่านได้)

## สร้าง AAB ใหม่ภายหลัง

```bash
npm run mobile:build
cd android
.\gradlew.bat bundleRelease
```
