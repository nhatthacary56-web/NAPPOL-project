import { useEffect, useMemo, useState } from 'react'
import {
  THAI_PROVINCES,
  amphoesForProvince,
  ensureThaiAddressDb,
  filterList,
  formatLocationLabel,
  tambonsForAmphoe,
} from '../../data/thaiAddress'
import './AddressLocationPicker.css'

export type PickedLocation = {
  province: string
  amphoe: string
  tambon: string
  zipcode: string
}

type Step = 'province' | 'amphoe' | 'tambon'

type Props = {
  open: boolean
  value: PickedLocation | null
  onClose: () => void
  onPick: (value: PickedLocation) => void
}

export function AddressLocationPicker({ open, value, onClose, onPick }: Props) {
  const [step, setStep] = useState<Step>('province')
  const [query, setQuery] = useState('')
  const [province, setProvince] = useState(value?.province || '')
  const [amphoe, setAmphoe] = useState(value?.amphoe || '')
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('province')
    setQuery('')
    setProvince(value?.province || '')
    setAmphoe(value?.amphoe || '')
    setReady(false)
    setLoadError('')
    void ensureThaiAddressDb()
      .then(() => setReady(true))
      .catch(() => setLoadError('โหลดฐานข้อมูลที่อยู่ไม่สำเร็จ'))
  }, [open, value])

  const provinces = useMemo(
    () => filterList([...THAI_PROVINCES], query),
    [query],
  )
  const amphoes = useMemo(
    () => (province ? filterList(amphoesForProvince(province), query) : []),
    [province, query],
  )
  const tambons = useMemo(() => {
    if (!province || !amphoe) return []
    const rows = tambonsForAmphoe(province, amphoe)
    const q = query.trim().toLowerCase()
    return q
      ? rows.filter(
          (r) =>
            r.district.toLowerCase().includes(q) ||
            String(r.zipcode).includes(q),
        )
      : rows
  }, [province, amphoe, query])

  if (!open) return null

  const title =
    step === 'province'
      ? 'เลือกจังหวัด'
      : step === 'amphoe'
        ? `เลือกเขต/อำเภอ · ${province}`
        : `เลือกแขวง/ตำบล · ${amphoe}`

  return (
    <div
      className="addr-picker"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="addr-picker__sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="addr-picker__head">
          <button
            type="button"
            className="addr-picker__back"
            onClick={() => {
              if (step === 'tambon') {
                setStep('amphoe')
                setQuery('')
                return
              }
              if (step === 'amphoe') {
                setStep('province')
                setAmphoe('')
                setQuery('')
                return
              }
              onClose()
            }}
          >
            ‹
          </button>
          <div>
            <strong>{title}</strong>
            <p>
              {formatLocationLabel({
                province: province || undefined,
                amphoe: step === 'tambon' ? amphoe : undefined,
              }) || 'จังหวัด / เขต / รหัสไปรษณีย์ / แขวง'}
            </p>
          </div>
          <button type="button" className="addr-picker__close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="addr-picker__steps">
          <button
            type="button"
            className={step === 'province' ? 'is-active' : undefined}
            onClick={() => {
              setStep('province')
              setQuery('')
            }}
          >
            จังหวัด
          </button>
          <button
            type="button"
            disabled={!province}
            className={step === 'amphoe' ? 'is-active' : undefined}
            onClick={() => {
              if (!province) return
              setStep('amphoe')
              setQuery('')
            }}
          >
            เขต/อำเภอ
          </button>
          <button
            type="button"
            disabled={!amphoe}
            className={step === 'tambon' ? 'is-active' : undefined}
            onClick={() => {
              if (!amphoe) return
              setStep('tambon')
              setQuery('')
            }}
          >
            แขวง/ตำบล
          </button>
        </div>

        <label className="addr-picker__search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              step === 'province'
                ? 'ค้นหาจังหวัด'
                : step === 'amphoe'
                  ? 'ค้นหาเขต/อำเภอ'
                  : 'ค้นหาแขวง/ตำบล หรือรหัสไปรษณีย์'
            }
            autoFocus
          />
        </label>

        <ul className="addr-picker__list">
          {!ready && !loadError ? (
            <li className="addr-picker__empty">กำลังโหลดรายชื่อจังหวัด...</li>
          ) : null}
          {loadError ? <li className="addr-picker__empty">{loadError}</li> : null}

          {ready && step === 'province'
            ? provinces.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => {
                      setProvince(name)
                      setAmphoe('')
                      setStep('amphoe')
                      setQuery('')
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))
            : null}

          {ready && step === 'amphoe'
            ? amphoes.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => {
                      setAmphoe(name)
                      setStep('tambon')
                      setQuery('')
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))
            : null}

          {ready && step === 'tambon'
            ? tambons.map((row) => (
                <li key={`${row.district}-${row.zipcode}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick({
                        province,
                        amphoe,
                        tambon: row.district,
                        zipcode: String(row.zipcode),
                      })
                      onClose()
                    }}
                  >
                    <strong>{row.district}</strong>
                    <em>รหัสไปรษณีย์ {row.zipcode}</em>
                  </button>
                </li>
              ))
            : null}

          {ready &&
          ((step === 'province' && provinces.length === 0) ||
            (step === 'amphoe' && amphoes.length === 0) ||
            (step === 'tambon' && tambons.length === 0)) ? (
            <li className="addr-picker__empty">ไม่พบรายการ</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
