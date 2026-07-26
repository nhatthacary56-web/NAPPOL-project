import { useEffect } from 'react'
import './ImageLightbox.css'

type Props = {
  images: string[]
  index: number
  alt?: string
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function ImageLightbox({ images, index, alt = '', onClose, onIndexChange }: Props) {
  const safeIndex = ((index % images.length) + images.length) % images.length
  const src = images[safeIndex]

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
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

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="ดูรูปสินค้าขยาย"
      onClick={onClose}
    >
      <button type="button" className="image-lightbox__close" aria-label="ปิด" onClick={onClose}>
        ✕
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="image-lightbox__nav image-lightbox__nav--prev"
            aria-label="รูปก่อนหน้า"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((safeIndex - 1 + images.length) % images.length)
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="image-lightbox__nav image-lightbox__nav--next"
            aria-label="รูปถัดไป"
            onClick={(e) => {
              e.stopPropagation()
              onIndexChange((safeIndex + 1) % images.length)
            }}
          >
            ›
          </button>
        </>
      ) : null}
      <img
        src={src}
        alt={alt}
        className="image-lightbox__img"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 ? (
        <p className="image-lightbox__count">
          {safeIndex + 1} / {images.length}
        </p>
      ) : null}
    </div>
  )
}
