import { useEffect, useState, type FormEvent } from 'react'
import { ImageUpload } from '../../components/ImageUpload'
import { THAI_BANKS } from '../../data/thaiBanks'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import { shopApi } from '../../api'
import './SellerShell.css'

export function SellerShopPage() {
  const { shop, refreshSession } = useStore()
  const { toast } = useToast()
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    logoUrl: '',
    coverUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    businessType: 'individual' as 'individual' | 'company',
    addressLine: '',
    idCardNumber: '',
    idCardImageUrl: '',
    selfieImageUrl: '',
    taxId: '',
    bankName: THAI_BANKS[0] as string,
    bankAccountName: '',
    bankAccountNumber: '',
    bookBankImageUrl: '',
    kycNote: '',
  })

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name,
        description: shop.description || '',
        location: shop.location || '',
        logoUrl: shop.logoUrl || '',
        coverUrl: shop.coverUrl || '',
        contactName: shop.contactName || '',
        contactPhone: shop.contactPhone || '',
        contactEmail: shop.contactEmail || '',
        businessType: shop.businessType || 'individual',
        addressLine: shop.addressLine || '',
        idCardNumber: shop.idCardNumber || '',
        idCardImageUrl: shop.idCardImageUrl || '',
        selfieImageUrl: shop.selfieImageUrl || '',
        taxId: shop.taxId || '',
        bankName: shop.bankName || THAI_BANKS[0],
        bankAccountName: shop.bankAccountName || '',
        bankAccountNumber: shop.bankAccountNumber || '',
        bookBankImageUrl: shop.bookBankImageUrl || '',
        kycNote: shop.kycNote || '',
      })
    }
  }, [shop])

  if (!shop) {
    return (
      <div className="seller-page">
        <h1>ร้านค้า</h1>
        <p className="seller-page__sub">ยังไม่มีร้าน — กลับไปเปิดร้านที่หน้าภาพรวม</p>
      </div>
    )
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!shop) return
    try {
      await shopApi.updateMine(form)
      await refreshSession()
      toast(shop.status === 'rejected' ? 'ส่งเอกสารใหม่แล้ว รอแอดมินตรวจ' : 'บันทึกร้านแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function toggleVacation() {
    if (!shop) return
    try {
      const next = !shop.vacationMode
      await shopApi.updateMine({ vacationMode: next })
      await refreshSession()
      toast(next ? 'เปิดโหมดพักร้อนแล้ว' : 'ปิดโหมดพักร้อนแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    }
  }

  return (
    <div className="seller-page">
      <h1>ตั้งค่าร้าน</h1>
      <p className="seller-page__sub">
        slug: {shop.slug} · สถานะ <span className={`seller-badge ${shop.status}`}>{shop.status}</span>
        {shop.vacationMode ? <span className="seller-badge vacation">โหมดพักร้อน</span> : null}
      </p>

      {shop.status === 'rejected' ? (
        <div className="seller-announce seller-announce--danger" role="alert">
          <span aria-hidden>⚠️</span>
          <p>ถูกปฏิเสธ: {shop.rejectionReason || 'เอกสารไม่ครบ'} — แก้แล้วกดบันทึกเพื่อส่งใหม่</p>
        </div>
      ) : null}

      <div className="seller-card seller-vacation-card">
        <div>
          <strong>โหมดพักร้อน</strong>
          <p>ซ่อนสินค้าจากหน้าค้นหาและหน้าร้านชั่วคราว — ออเดอร์เดิมยังจัดการได้</p>
        </div>
        <button
          type="button"
          className={`seller-btn ${shop.vacationMode ? 'danger' : 'ghost'}`}
          onClick={() => void toggleVacation()}
        >
          {shop.vacationMode ? 'ปิดโหมดพักร้อน' : 'เปิดโหมดพักร้อน'}
        </button>
      </div>

      <div className="seller-card">
        <form className="seller-form" onSubmit={onSubmit}>
          <h2 className="seller-section-title">โปรไฟล์ร้าน</h2>
          <label>
            ชื่อร้าน
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </label>
          <label>
            ที่ตั้ง
            <input
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </label>
          <label>
            รายละเอียด
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </label>
          <label>
            โลโก้
            <ImageUpload
              value={form.logoUrl}
              onChange={(url) => setForm((p) => ({ ...p, logoUrl: url }))}
            />
          </label>
          <label>
            รูปปก
            <ImageUpload
              value={form.coverUrl}
              onChange={(url) => setForm((p) => ({ ...p, coverUrl: url }))}
            />
          </label>

          <h2 className="seller-section-title">ผู้ติดต่อ / KYC</h2>
          <div className="seller-form-grid">
            <label>
              ชื่อผู้ติดต่อ
              <input
                value={form.contactName}
                onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
              />
            </label>
            <label>
              เบอร์โทร
              <input
                value={form.contactPhone}
                onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
              />
            </label>
            <label>
              อีเมล
              <input
                value={form.contactEmail}
                onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
              />
            </label>
            <label>
              ประเภท
              <select
                value={form.businessType}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    businessType: e.target.value as 'individual' | 'company',
                  }))
                }
              >
                <option value="individual">บุคคลธรรมดา</option>
                <option value="company">นิติบุคคล</option>
              </select>
            </label>
          </div>
          <label>
            ที่อยู่ร้าน
            <textarea
              value={form.addressLine}
              onChange={(e) => setForm((p) => ({ ...p, addressLine: e.target.value }))}
            />
          </label>
          <label>
            เลขบัตรประชาชน
            <input
              value={form.idCardNumber}
              onChange={(e) => setForm((p) => ({ ...p, idCardNumber: e.target.value }))}
            />
          </label>
          <label>
            รูปบัตรประชาชน
            <ImageUpload
              value={form.idCardImageUrl}
              onChange={(url) => setForm((p) => ({ ...p, idCardImageUrl: url }))}
            />
          </label>
          <label>
            รูปถ่ายคู่บัตร
            <ImageUpload
              value={form.selfieImageUrl}
              onChange={(url) => setForm((p) => ({ ...p, selfieImageUrl: url }))}
            />
          </label>

          <h2 className="seller-section-title">บัญชีรับเงิน</h2>
          <p className="seller-page__sub" style={{ marginTop: 0 }}>
            ชื่อบัญชีควรตรงกับชื่อผู้ติดต่อ — ใช้ตอนถอนเงิน
          </p>
          <label>
            ธนาคาร
            <select
              value={form.bankName}
              onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
            >
              {THAI_BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </label>
          <label>
            ชื่อบัญชี
            <input
              value={form.bankAccountName}
              onChange={(e) => setForm((p) => ({ ...p, bankAccountName: e.target.value }))}
            />
          </label>
          <label>
            เลขบัญชี
            <input
              value={form.bankAccountNumber}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  bankAccountNumber: e.target.value.replace(/[^\d-]/g, ''),
                }))
              }
            />
          </label>
          <label>
            รูปหน้าบัญชี
            <ImageUpload
              value={form.bookBankImageUrl}
              onChange={(url) => setForm((p) => ({ ...p, bookBankImageUrl: url }))}
            />
          </label>

          <button className="seller-btn" type="submit">
            {shop.status === 'rejected' ? 'ส่งเอกสารใหม่' : 'บันทึก'}
          </button>
        </form>
      </div>
    </div>
  )
}
