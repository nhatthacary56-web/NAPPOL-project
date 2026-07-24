import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './AddressesPage.css'

export function AddressesPage() {
  const { addresses, addAddress, setDefaultAddress, removeAddress } = useStore()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    line1: '',
    district: '',
    province: '',
    postalCode: '',
  })

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    try {
      await addAddress({ ...form, isDefault: addresses.length === 0 })
      toast('เพิ่มที่อยู่แล้ว')
      setForm({
        name: '',
        phone: '',
        line1: '',
        district: '',
        province: '',
        postalCode: '',
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
              </h2>
              <p>
                {address.line1}, {address.district}, {address.province}{' '}
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
            {(
              [
                ['name', 'ชื่อผู้รับ'],
                ['phone', 'เบอร์โทร'],
                ['line1', 'ที่อยู่'],
                ['district', 'เขต/อำเภอ'],
                ['province', 'จังหวัด'],
                ['postalCode', 'รหัสไปรษณีย์'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  required
                />
              </label>
            ))}
            <button type="submit">บันทึกที่อยู่</button>
          </form>
        ) : (
          <button type="button" className="addresses-page__add" onClick={() => setOpen(true)}>
            + เพิ่มที่อยู่ใหม่
          </button>
        )}
      </main>
    </div>
  )
}
