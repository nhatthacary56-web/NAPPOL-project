import { useState } from 'react'
import { uploadApi } from '../api'
import { useToast } from '../store/ToastContext'
import './ImageUpload.css'

type ImageUploadProps = {
  value: string
  onChange: (url: string) => void
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  async function onFile(file?: File | null) {
    if (!file) return
    setBusy(true)
    try {
      const res = await uploadApi.image(file)
      onChange(res.url)
      if (res.warning) toast(res.warning)
      else if (res.storage === 'supabase') toast('อัปโหลดรูปถาวรสำเร็จ')
      else toast('อัปโหลดรูปสำเร็จ')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปโหลดไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="image-upload">
      {value ? <img src={value} alt="preview" className="image-upload__preview" /> : null}
      <div className="image-upload__row">
        <label className="image-upload__btn">
          {busy ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปจากเครื่อง'}
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={busy}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
        </label>
        <input
          className="image-upload__url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="หรือวาง URL รูปภาพ"
        />
      </div>
    </div>
  )
}
