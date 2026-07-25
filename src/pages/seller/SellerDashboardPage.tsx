import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { returnApi, shopApi } from '../../api'
import { ImageUpload } from '../../components/ImageUpload'
import { defaultAppContent } from '../../data/appContent'
import { THAI_BANKS } from '../../data/thaiBanks'
import { formatPrice } from '../../data/catalog'
import { useCatalog } from '../../store/CatalogContext'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import type { Shop } from '../../api/types'
import './SellerShell.css'

const emptyOpenForm = {
  name: '',
  description: '',
  location: 'กรุงเทพฯ',
  businessType: 'individual' as 'individual' | 'company',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  addressLine: '',
  idCardNumber: '',
  idCardImageUrl: '',
  selfieImageUrl: '',
  taxId: '',
  bankName: THAI_BANKS[0] as string,
  bankAccountName: '',
  bankAccountNumber: '',
  bookBankImageUrl: '',
  logoUrl: '',
  kycNote: '',
}

export function SellerDashboardPage() {
  const { user, shop, refreshSession, orders, unreadCount } = useStore()
  const { loadMine, appContent } = useCatalog()
  const { toast } = useToast()
  const [myProducts, setMyProducts] = useState(0)
  const [pendingReturns, setPendingReturns] = useState(0)
  const [form, setForm] = useState(emptyOpenForm)
  const [localShop, setLocalShop] = useState<Shop | null>(shop)
  const [step, setStep] = useState(1)

  const sellerCopy = {
    ...defaultAppContent.seller,
    ...appContent.seller,
  }

  useEffect(() => {
    setLocalShop(shop)
  }, [shop])

  useEffect(() => {
    if (user) {
      setForm((p) => ({
        ...p,
        contactName: p.contactName || user.name || '',
        contactPhone: p.contactPhone || user.phone || '',
        contactEmail: p.contactEmail || user.email || '',
        bankAccountName: p.bankAccountName || user.name || '',
      }))
    }
  }, [user])

  useEffect(() => {
    void loadMine().then((items) => setMyProducts(items.length)).catch(() => setMyProducts(0))
  }, [loadMine, shop])

  useEffect(() => {
    if (!shop) {
      setPendingReturns(0)
      return
    }
    void returnApi
      .seller()
      .then((res) => {
        setPendingReturns(res.returns.filter((r) => r.status === 'pending').length)
      })
      .catch(() => setPendingReturns(0))
  }, [shop, orders.length])

  async function openShop(event: FormEvent) {
    event.preventDefault()
    try {
      const res = await shopApi.register(form)
      setLocalShop(res.shop)
      await refreshSession()
      toast(
        res.shop.status === 'active'
          ? 'เปิดร้านสำเร็จ'
          : 'ส่งคำขอเปิดร้านแล้ว รอแอดมินตรวจเอกสาร',
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เปิดร้านไม่สำเร็จ')
    }
  }

  const kpis = useMemo(() => {
    const toShip = orders.filter((o) => o.status === 'to_ship').length
    const cancelled = orders.filter((o) => o.status === 'cancelled' || o.status === 'refunded').length
    const toReview = orders.filter((o) => o.status === 'to_review').length
    const revenue = orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'unpaid')
      .reduce((s, o) => s + o.total, 0)
    return { toShip, cancelled, toReview, revenue }
  }, [orders])

  if (!localShop) {
    return (
      <div className="seller-page">
        <h1>เปิดร้านบน Great App</h1>
        <p className="seller-page__sub">
          สวัสดี {user?.name} — กรอกข้อมูลร้าน + ยืนยันตัวตน + บัญชีรับเงิน ให้ครบก่อนส่งอนุมัติ
        </p>

        <div className="seller-steps">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              className={step === n ? 'is-active' : undefined}
              onClick={() => setStep(n)}
            >
              {n === 1 ? '1. ข้อมูลร้าน' : n === 2 ? '2. ยืนยันตัวตน' : '3. บัญชีธนาคาร'}
            </button>
          ))}
        </div>

        <div className="seller-card">
          <form className="seller-form" onSubmit={openShop}>
            {step === 1 ? (
              <>
                <label>
                  ชื่อร้าน *
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  ประเภทร้าน
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
                <label>
                  ที่ตั้งร้าน / จังหวัด
                  <input
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  />
                </label>
                <label>
                  ที่อยู่ร้าน (รายละเอียด)
                  <textarea
                    value={form.addressLine}
                    onChange={(e) => setForm((p) => ({ ...p, addressLine: e.target.value }))}
                    placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  />
                </label>
                <label>
                  รายละเอียดร้าน
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </label>
                <label>
                  โลโก้ร้าน (ไม่บังคับ)
                  <ImageUpload
                    value={form.logoUrl}
                    onChange={(url) => setForm((p) => ({ ...p, logoUrl: url }))}
                  />
                </label>
                <div className="seller-form-grid">
                  <label>
                    ชื่อผู้ติดต่อ / เจ้าของร้าน *
                    <input
                      value={form.contactName}
                      onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    เบอร์โทร *
                    <input
                      value={form.contactPhone}
                      onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                      required
                    />
                  </label>
                  <label>
                    อีเมลติดต่อ
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                    />
                  </label>
                  {form.businessType === 'company' ? (
                    <label>
                      เลขประจำตัวผู้เสียภาษี
                      <input
                        value={form.taxId}
                        onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                      />
                    </label>
                  ) : null}
                </div>
                <button type="button" className="seller-btn" onClick={() => setStep(2)}>
                  ถัดไป: ยืนยันตัวตน
                </button>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <label>
                  เลขบัตรประชาชน *
                  <input
                    value={form.idCardNumber}
                    onChange={(e) => setForm((p) => ({ ...p, idCardNumber: e.target.value }))}
                    placeholder="x-xxxx-xxxxx-xx-x"
                    required
                  />
                </label>
                <label>
                  รูปบัตรประชาชน (ชัด อ่านตัวเลขได้) *
                  <ImageUpload
                    value={form.idCardImageUrl}
                    onChange={(url) => setForm((p) => ({ ...p, idCardImageUrl: url }))}
                  />
                </label>
                <label>
                  รูปถ่ายคู่บัตร (แนะนำ)
                  <ImageUpload
                    value={form.selfieImageUrl}
                    onChange={(url) => setForm((p) => ({ ...p, selfieImageUrl: url }))}
                  />
                </label>
                <label>
                  หมายเหตุถึงแอดมิน
                  <textarea
                    value={form.kycNote}
                    onChange={(e) => setForm((p) => ({ ...p, kycNote: e.target.value }))}
                  />
                </label>
                <div className="seller-actions">
                  <button type="button" className="seller-btn ghost" onClick={() => setStep(1)}>
                    ย้อนกลับ
                  </button>
                  <button type="button" className="seller-btn" onClick={() => setStep(3)}>
                    ถัดไป: บัญชีธนาคาร
                  </button>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <p className="seller-page__sub" style={{ marginTop: 0 }}>
                  ชื่อบัญชีต้องตรงกับชื่อผู้ติดต่อ/เจ้าของร้าน เพื่อรับเงินถอนจากยอดขาย
                </p>
                <label>
                  ธนาคาร *
                  <select
                    value={form.bankName}
                    onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                    required
                  >
                    {THAI_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  ชื่อบัญชี *
                  <input
                    value={form.bankAccountName}
                    onChange={(e) => setForm((p) => ({ ...p, bankAccountName: e.target.value }))}
                    required
                  />
                </label>
                <label>
                  เลขบัญชี *
                  <input
                    value={form.bankAccountNumber}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        bankAccountNumber: e.target.value.replace(/[^\d-]/g, ''),
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  รูปหน้าบัญชี / บุ๊คแบงก์ (แนะนำ)
                  <ImageUpload
                    value={form.bookBankImageUrl}
                    onChange={(url) => setForm((p) => ({ ...p, bookBankImageUrl: url }))}
                  />
                </label>
                <div className="seller-actions">
                  <button type="button" className="seller-btn ghost" onClick={() => setStep(2)}>
                    ย้อนกลับ
                  </button>
                  <button className="seller-btn" type="submit">
                    ส่งคำขอเปิดร้าน
                  </button>
                </div>
              </>
            ) : null}
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="seller-page seller-home">
      <header className="seller-home__header">
        <div className="seller-home__identity">
          <div className="seller-home__avatar" aria-hidden>
            {localShop.logoUrl ? (
              <img src={localShop.logoUrl} alt="" />
            ) : (
              localShop.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <h1>{localShop.name}</h1>
            <p className="seller-page__sub" style={{ margin: 0 }}>
              สถานะ{' '}
              <span className={`seller-badge ${localShop.status}`}>{localShop.status}</span>
              {localShop.vacationMode ? (
                <span className="seller-badge vacation">โหมดพักร้อน</span>
              ) : null}
            </p>
          </div>
        </div>
        <Link className="seller-home__notify" to="/chats" aria-label="แชท">
          <span aria-hidden>💬</span>
          {unreadCount > 0 ? <em>{unreadCount > 99 ? '99+' : unreadCount}</em> : null}
        </Link>
      </header>

      {localShop.status === 'rejected' ? (
        <div className="seller-announce seller-announce--danger" role="alert">
          <span aria-hidden>⚠️</span>
          <p>
            คำขอถูกปฏิเสธ: {localShop.rejectionReason || 'เอกสารไม่ครบ'} — ไปที่ตั้งค่าร้านเพื่อส่งใหม่
          </p>
        </div>
      ) : null}

      {sellerCopy.announcement ? (
        <div className="seller-announce" role="status">
          <span aria-hidden>📢</span>
          <p>{sellerCopy.announcement}</p>
        </div>
      ) : null}

      {localShop.status === 'pending' ? (
        <p className="seller-page__sub">รอแอดมินตรวจบัตรประชาชนและบัญชีธนาคารก่อนลงขายได้</p>
      ) : null}

      <div className="seller-kpi">
        <Link className="seller-kpi__item" to="/seller/orders?status=to_ship">
          <strong className={kpis.toShip > 0 ? 'is-urgent' : undefined}>{kpis.toShip}</strong>
          <span>ที่ต้องจัดส่ง</span>
        </Link>
        <Link className="seller-kpi__item" to="/seller/orders?status=cancelled">
          <strong>{kpis.cancelled}</strong>
          <span>ยกเลิก/คืนเงิน</span>
        </Link>
        <Link className="seller-kpi__item" to="/seller/returns">
          <strong className={pendingReturns > 0 ? 'is-urgent' : undefined}>{pendingReturns}</strong>
          <span>คืนสินค้า</span>
        </Link>
        <Link className="seller-kpi__item" to="/seller/orders?status=to_review">
          <strong>{kpis.toReview}</strong>
          <span>รอรีวิว</span>
        </Link>
      </div>

      <div className="seller-card seller-home__snapshot">
        <div>
          <span>สินค้าในร้าน</span>
          <strong>{myProducts}</strong>
        </div>
        <div>
          <span>ออเดอร์ทั้งหมด</span>
          <strong>{orders.length}</strong>
        </div>
        <div>
          <span>ยอดขาย (ไม่รวมยกเลิก)</span>
          <strong>{formatPrice(kpis.revenue)}</strong>
        </div>
      </div>

      <section className="seller-card">
        <h2 className="seller-section-title">ทางลัด</h2>
        <div className="seller-quick">
          <Link to="/seller/products" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#dbeafe' }}>
              📦
            </span>
            สินค้าของฉัน
          </Link>
          <Link to="/seller/orders" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#fce7f3' }}>
              📋
            </span>
            ออเดอร์
          </Link>
          <Link to="/seller/vouchers" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#ffedd5' }}>
              🎟️
            </span>
            คูปองร้าน
          </Link>
          <Link to="/seller/wallet" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#d1fae5' }}>
              💳
            </span>
            การเงิน
          </Link>
          <Link to="/seller/shop" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#e0e7ff' }}>
              🏪
            </span>
            ตั้งค่าร้าน
          </Link>
          <Link to="/chats" className="seller-quick__item">
            <span className="seller-quick__icon" style={{ background: '#fef3c7' }}>
              💬
            </span>
            แชท
          </Link>
        </div>
      </section>

      {sellerCopy.tipBody ? (
        <section className="seller-card seller-tip">
          <h2 className="seller-section-title">{sellerCopy.tipTitle || 'คำแนะนำ'}</h2>
          <p>{sellerCopy.tipBody}</p>
          <div className="seller-actions">
            <Link className="seller-btn ghost" to="/seller/vouchers">
              สร้างคูปองร้าน
            </Link>
            {localShop.status === 'active' ? (
              <Link className="seller-btn" to={`/shop/${localShop.slug}`}>
                ดูหน้าร้าน
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  )
}
