import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { catalogApi } from '../api'
import type { ApiProduct } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { ProductGrid } from '../components/product/ProductGrid'
import { useToast } from '../store/ToastContext'
import './VisualSearchPage.css'

export function VisualSearchPage() {
  const [params] = useSearchParams()
  const productId = params.get('productId') || ''
  const navigate = useNavigate()
  const { toast } = useToast()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [queryColor, setQueryColor] = useState<{ r: number; g: number; b: number } | null>(null)

  useEffect(() => {
    if (!productId) return
    setBusy(true)
    setMessage('กำลังหาของคล้ายจากสินค้านี้อยู่...')
    void catalogApi
      .visualSearchByProduct(productId)
      .then((res) => {
        setProducts(res.products || [])
        setMessage(res.message || 'ผลลัพธ์ของที่คล้ายกัน')
        setQueryColor(res.queryColor || null)
        setPreview('')
      })
      .catch((err) => {
        toast(err instanceof Error ? err.message : 'ค้นหาไม่สำเร็จ')
        setMessage('ค้นหาไม่สำเร็จ')
      })
      .finally(() => setBusy(false))
  }, [productId, toast])

  async function runWithFile(file: File) {
    setBusy(true)
    setPreview(URL.createObjectURL(file))
    setMessage('กำลังวิเคราะห์รูปและค้นหาสินค้า...')
    try {
      const res = await catalogApi.visualSearchFile(file)
      setProducts(res.products || [])
      setMessage(res.message || 'ผลลัพธ์การค้นหา')
      setQueryColor(res.queryColor || null)
      // clear productId mode from URL when uploading new image
      if (productId) navigate('/search/visual', { replace: true })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ค้นหาด้วยรูปไม่สำเร็จ')
      setMessage('ค้นหาไม่สำเร็จ')
      setProducts([])
    } finally {
      setBusy(false)
    }
  }

  function onPick(file?: File | null) {
    if (!file) return
    void runWithFile(file)
  }

  return (
    <div className="app-frame">
      <PageHeader title="ค้นหาด้วยรูป" backTo="/" />
      <main className="visual-search">
        <section className="visual-search__hero">
          <h1>สแกนหาสินค้า</h1>
          <p>
            ถ่ายหรืออัปโหลดรูป — ถ้ามีของใกล้เคียงในร้านจะโชว์ให้ ถ้าไม่ตรงเป๊ะจะแนะนำของคล้ายกัน
          </p>
          <div className="visual-search__actions">
            <button
              type="button"
              className="visual-search__btn"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
            >
              เปิดกล้องถ่ายรูป
            </button>
            <button
              type="button"
              className="visual-search__btn ghost"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
            >
              เลือกรูปจากเครื่อง
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              onPick(e.target.files?.[0])
              e.currentTarget.value = ''
            }}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              onPick(e.target.files?.[0])
              e.currentTarget.value = ''
            }}
          />
        </section>

        {(preview || queryColor || busy || message) && (
          <section className="visual-search__status">
            {preview ? <img src={preview} alt="รูปที่ค้นหา" /> : null}
            {queryColor ? (
              <span
                className="visual-search__swatch"
                style={{
                  background: `rgb(${queryColor.r}, ${queryColor.g}, ${queryColor.b})`,
                }}
                title="โทนสีหลักจากรูป"
              />
            ) : null}
            <p>{busy ? 'กำลังค้นหา...' : message}</p>
          </section>
        )}

        {products.length > 0 ? (
          <ProductGrid title={productId ? 'สินค้าที่คล้ายกัน' : 'ผลลัพธ์จากรูป'} items={products} />
        ) : !busy && (preview || productId) ? (
          <p className="visual-search__empty">
            ยังไม่พบสินค้าใกล้เคียง — ลองรูปอื่น หรือดู{' '}
            <Link to="/mall">Mall</Link>
          </p>
        ) : null}
      </main>
    </div>
  )
}
