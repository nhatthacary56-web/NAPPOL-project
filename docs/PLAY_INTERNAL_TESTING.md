# DeeJa — Play Store Internal Testing (Phase 1)

แอป Android ห่อเว็บด้วย Capacitor แล้ว  
`applicationId`: `com.deeja.app` · ชื่อ: **DeeJa** · เวอร์ชันเริ่มต้น: `0.1.0` (versionCode `1`)

เว็บที่โหลดในแอป: https://nappol-project.onrender.com  
(อัปเดตเว็บบน Render ได้โดยไม่ต้องอัปโหลด Play ใหม่ทุกครั้ง)

---

## สิ่งที่ต้องมีบนเครื่องคุณ

1. [Android Studio](https://developer.android.com/studio) (มี JDK ในตัว)
2. บัญชี [Google Play Console](https://play.google.com/console) (จ่ายค่าลงทะเบียนครั้งเดียว ~$25)
3. โปรเจกต์นี้บนเครื่อง + Node 20+

---

## สร้าง AAB (ไฟล์อัปโหลด Play)

```bash
npm run mobile:build
npm run mobile:open
```

ใน Android Studio:

1. รอ Gradle sync จบ
2. **Build → Generate Signed Bundle / APK → Android App Bundle**
3. สร้าง keystore ใหม่ (เก็บไฟล์ `.jks` ไว้ปลอดภัย — ห้ามทำหาย)
4. ได้ไฟล์ประมาณ `android/app/release/app-release.aab`

---

## อัปโหลด Internal testing

1. Play Console → สร้างแอป → ชื่อ **DeeJa**
2. ไปที่ **Testing → Internal testing → Create new release**
3. อัปโหลด `.aab`
4. เพิ่มอีเมลเทสเตอร์ (Gmail)
5. คัดลอกลิงก์เข้าร่วมเทสต์ให้ทีม

ยังไม่ต้องกด Production

---

## ฟอร์มใน Play Console ที่ต้องกรอก

| หัวข้อ | ค่าแนะนำ |
|--------|----------|
| Privacy policy | `https://nappol-project.onrender.com/privacy` |
| ลบบัญชี | ในแอป: การตั้งค่า → ลบบัญชี (พิมพ์ DELETE) |
| หมวดหมู่ | Shopping |
| ติดต่อ | อีเมลจริงของคุณ |
| Data safety | เก็บบัญชี/ออเดอร์/ที่อยู่ — ไม่ขายข้อมูล |
| ไอคอน 512 | `store/play/icon-512.png` |
| Feature graphic | `store/play/feature-graphic-1024x500.png` |
| ภาพหน้าจอโทรศัพท์ | ถ่ายจากแอป/เว็บมือถืออย่างน้อย 2 รูป |

### คำอธิบายสั้น (คัดลอกได้)

**ชื่อ:** DeeJa

**สั้น:** ช้อปออนไลน์ ชำระปลายทาง หรือสแกน QR PromptPay

**เต็ม:**  
DeeJa เป็นแอปตลาดออนไลน์ สั่งสินค้าจากร้านในแพลตฟอร์ม ชำระด้วยเก็บเงินปลายทางหรือสแกน QR/PromptPay ติดตามออเดอร์ คืนสินค้า และจัดการบัญชีได้ในแอป

---

## Env บน Render ก่อนแจกเทสเตอร์จริงจัง

แนะนำตั้งใน Render Environment:

```
AUTH_DEMO_OTP=0
AUTH_DEMO_SOCIAL=0
JWT_SECRET=<สุ่มยาวๆ>
```

ถ้ายังไม่ได้ต่อ Google/LINE จริง เทสเตอร์เข้าด้วยอีเมล/รหัสผ่านได้

ตรวจลิงก์ก่อนส่งรีวิว:
- https://nappol-project.onrender.com/privacy
- https://nappol-project.onrender.com/terms

---

## คำสั่งที่เกี่ยวกับมือถือ

| คำสั่ง | ความหมาย |
|--------|----------|
| `npm run mobile:build` | build เว็บ + sync เข้าโฟลเดอร์ `android/` |
| `npm run mobile:sync` | sync อย่างเดียว |
| `npm run mobile:open` | เปิด Android Studio |

เปลี่ยน URL ที่แอปโหลด: ตั้ง `CAP_SERVER_URL` ก่อน sync (ดู `capacitor.config.ts`)

---

## สิ่งที่ Phase 1 ยังไม่ได้ทำให้ครบ (ทำเองใน Console)

- จ่ายค่าลงทะเบียน Play / สร้างแอปใน Console
- สร้าง signing keystore และเก็บสำรอง
- ถ่าย screenshot จริงจากมือถือ
- กด Invite testers

หลัง Internal testing เสถียร ค่อยไปเฟส 2 (ยืนยันสลิป, ล้างเดโม, ฯลฯ) ก่อน Production
