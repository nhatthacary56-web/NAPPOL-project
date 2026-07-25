import { useMemo, useState, type FormEvent } from 'react'
import {
  AddressLocationPicker,
  type PickedLocation,
} from '../components/address/AddressLocationPicker'
import { formatLocationLabel } from '../data/thaiAddress'
import { PageHeader } from '../components/layout/PageHeader'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AddressesPage.css'

function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('66') && digits.length >= 10) digits = `0${digits.slice(2)}`
  return digits
}

export function AddressesPage() {
  const { addresses, addAddress, setDefaultAddress, removeAddress } = useStore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    line1: '',
    line2: '',
    district: '',
    subdistrict: '',
    province: '',
    postalCode: '',
    addressType: 'home' as 'home' | 'office',
    isDefault: false,
  })

  const location = useMemo<PickedLocation | null>(() => {
    if (!form.province || !form.district || !form.subdistrict || !form.postalCode) return null
    return {
      province: form.province,
      amphoe: form.district,
      tambon: form.subdistrict,
      zipcode: form.postalCode,
    }
  }, [form.province, form.district, form.subdistrict, form.postalCode])

  const locationLabel = formatLocationLabel({
    province: form.province || undefined,
    amphoe: form.district || undefined,
    tambon: form.subdistrict || undefined,
    zipcode: form.postalCode || undefined,
  })

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.province || !form.district || !form.subdistrict || !form.postalCode) {
      toast('กรุณาเลือกจังหวัด / เขต / แขวง จากรายการ')
      setPickerOpen(true)
      return
    }
    try {
      await addAddress({
        name: form.name.trim(),
        phone: normalizePhone(form.phone),
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        district: form.district,
        subdistrict: form.subdistrict,
        province: form.province,
        postalCode: form.postalCode,
        addressType: form.addressType,
        isDefault: form.isDefault || addresses.length === 0,
      })
      toast('เพิ่มที่อยู่แล้ว')
      setForm({
        name: '',
        phone: '',
        line1: '',
        line2: '',
        district: '',
        subdistrict: '',
        province: '',
        postalCode: '',
        addressType: 'home',
        isDefault: false,
      })
      setOpen(false)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เพิ่มไม่สำเร็จ')
    }
  }

  return (
    <div className="app-frame">
      <PageHeader title="ที่อยู่ของฉัน" backTo="/account" />
      <main className="addresses-page">
        {addresses.map((address) => (
          <article key={address.id} className="address-card">
            <div>
              <h2>
                {address.name} · {address.phone}
                {address.isDefault ? <em>ค่าเริ่มต้น</em> : null}
                {address.addressType === 'office' ? <em className="muted">ออฟฟิศ</em> : null}
                {address.addressType === 'home' ? <em className="muted">บ้าน</em> : null}
              </h2>
              <p>
                {[address.line1, address.line2, address.subdistrict, address.district, address.province]
                  .filter(Boolean)
                  .join(', ')}{' '}
                {address.postalCode}
              </p>
            </div>
            <div className="address-card__actions">
              {!address.isDefault ? (
                <button
                  type="button"
                  onClick={async () => {
                    await setDefaultAddress(address.id)
                    toast('ตั้งค่าเริ่มต้นแล้ว')
                  }}
                >
                  ตั้งเป็นค่าเริ่มต้น
                </button>
              ) : null}
              <button
                type="button"
                className="danger"
                onClick={async () => {
                  await removeAddress(address.id)
                  toast('ลบที่อยู่แล้ว')
                }}
              >
                ลบ
              </button>
            </div>
          </article>
        ))}

        {open ? (
          <form className="address-form" onSubmit={onSubmit}>
            <h2>เพิ่มที่อยู่จัดส่ง</h2>

            <label>
              ชื่อ-นามสกุลผู้รับ <span>*</span>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </label>

            <label>
              เบอร์โทรศัพท์มือถือ <span>*</span>
              <div className="address-form__phone">
                <em>+66</em>
                <input
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="8xxxxxxxx"
                  required
                />
              </div>
            </label>

            <label>
              ถนน/ชื่ออาคาร <span>*</span>
              <input
                value={form.line1}
                onChange={(e) => setForm((p) => ({ ...p, line1: e.target.value }))}
                placeholder="บ้านเลขที่ ซอย ถนน"
                required
              />
            </label>

            <label>
              จังหวัด/เขต(อำเภอ)/รหัสไปรษณีย์/แขวง(ตำบล) <span>*</span>
              <button
                type="button"
                className={`address-form__picker${locationLabel ? '' : ' is-empty'}`}
                onClick={() => setPickerOpen(true)}
              >
                {locationLabel || 'แตะเพื่อเลือกจังหวัด → เขต → แขวง'}
              </button>
            </label>

            <label>
              เลขที่ยูนิต/ชั้น
              <input
                value={form.line2}
                onChange={(e) => setForm((p) => ({ ...p, line2: e.target.value }))}
                placeholder="ไม่บังคับ"
              />
            </label>

            <fieldset className="address-form__seg">
              <legend>ประเภทที่อยู่</legend>
              <div>
                <button
                  type="button"
                  className={form.addressType === 'home' ? 'is-on' : undefined}
                  onClick={() => setForm((p) => ({ ...p, addressType: 'home' }))}
                >
                  บ้าน
                </button>
                <button
                  type="button"
                  className={form.addressType === 'office' ? 'is-on' : undefined}
                  onClick={() => setForm((p) => ({ ...p, addressType: 'office' }))}
                >
                  ออฟฟิศ
                </button>
              </div>
            </fieldset>

            <fieldset className="address-form__seg">
              <legend>ที่อยู่จัดส่งหลัก</legend>
              <div>
                <button
                  type="button"
                  className={form.isDefault ? 'is-on' : undefined}
                  onClick={() => setForm((p) => ({ ...p, isDefault: true }))}
                >
                  เปิด
                </button>
                <button
                  type="button"
                  className={!form.isDefault ? 'is-on' : undefined}
                  onClick={() => setForm((p) => ({ ...p, isDefault: false }))}
                >
                  ปิด
                </button>
              </div>
            </fieldset>

            <p className="address-form__note">
              * พัสดุส่วนใหญ่จัดส่งวันทำการ ช่วง 8:00–18:00
            </p>

            <div className="address-form__actions">
              <button type="button" className="ghost" onClick={() => setOpen(false)}>
                ยกเลิก
              </button>
              <button type="submit">บันทึก</button>
            </div>
          </form>
        ) : (
          <button type="button" className="addresses-page__add" onClick={() => setOpen(true)}>
            + เพิ่มที่อยู่ใหม่
          </button>
        )}
      </main>

      <AddressLocationPicker
        open={pickerOpen}
        value={location}
        onClose={() => setPickerOpen(false)}
        onPick={(picked) => {
          setForm((p) => ({
            ...p,
            province: picked.province,
            district: picked.amphoe,
            subdistrict: picked.tambon,
            postalCode: picked.zipcode,
          }))
        }}
      />
    </div>
  )
}
