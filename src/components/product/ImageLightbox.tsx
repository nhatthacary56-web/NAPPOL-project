import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ImageLightbox.css'

type Props = {
  images: string[]
  index: number
  alt?: string
  productId?: string
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function ImageLightbox({
  images,
  index,
  alt = '',
  productId,
  onClose,
  onIndexChange,
}: Props) {
  const navigate = useNavigate()
  const safeIndex = images.length
    ? ((index % images.length) + images.length) % images.length
    : 0
  const src = images[safeIndex]
  const touchStartX = useRef<number | null>(null)
  const [dragX, setDragX] = useState(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (!images.length) return
      if (e.key === 'ArrowRight') onIndexChange((safeIndex + 1) % images.length)
      if (e.key === 'ArrowLeft') onIndexChange((safeIndex - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [images.length, onClose, onIndexChange, safeIndex])

  if (!src) return null

  function go(delta: number) {
    if (images.length <= 1) return
    onIndexChange((safeIndex + delta + images.length) % images.length)
  }

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="ดูรูปสินค้า">
      <header className="image-lightbox__bar">
        <button type="button" className="image-lightbox__close" aria-label="ปิด" onClick={onClose}>
          ✕
        </button>
        <p className="image-lightbox__count">
          {safeIndex + 1}/{images.length}
        </p>
      </header>

      <div
        className="image-lightbox__stage"
        onTouchStart={(e) => {
          touchStartX.current = e.changedTouches[0]?.clientX ?? null
          setDragX(0)
        }}
        onTouchMove={(e) => {
          if (touchStartX.current == null) return
          const x = e.changedTouches[0]?.clientX ?? touchStartX.current
          setDragX(x - touchStartX.current)
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return
          const x = e.changedTouches[0]?.clientX ?? touchStartX.current
          const delta = x - touchStartX.current
          touchStartX.current = null
          setDragX(0)
          if (delta < -48) go(1)
          else if (delta > 48) go(-1)
        }}
      >
        <img
          src={src}
          alt={alt}
          className="image-lightbox__img"
          style={{ transform: `translateX(${dragX * 0.35}px)` }}
          draggable={false}
        />
      </div>

      {images.length > 1 ? (
        <div className="image-lightbox__dots" aria-hidden>
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              className={i === safeIndex ? 'is-active' : undefined}
              onClick={() => onIndexChange(i)}
            />
          ))}
        </div>
      ) : null}

      {productId ? (
        <button
          type="button"
          className="image-lightbox__similar"
          onClick={() => {
            onClose()
            navigate(`/search/visual?productId=${productId}`)
          }}
        >
          <span aria-hidden>🔍</span>
          ค้นหาสินค้าที่คล้ายกัน
        </button>
      ) : null}
    </div>
  )
}
