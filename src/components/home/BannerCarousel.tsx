import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Banner } from '../../data/catalog'
import './BannerCarousel.css'

type BannerCarouselProps = {
  items: Banner[]
  ctaLabel?: string
}

export function BannerCarousel({ items, ctaLabel = 'ดูเลย' }: BannerCarouselProps) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = items.length

  useEffect(() => {
    setIndex(0)
  }, [count])

  useEffect(() => {
    if (count <= 1 || paused) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % count)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [count, paused])

  if (!count) return null

  return (
    <section
      className="banner-carousel"
      aria-label="โปรโมชัน"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="banner-carousel__viewport">
        <div
          className="banner-carousel__track"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
        >
          {items.map((banner, i) => {
            const hasImage = Boolean(banner.image)
            const className = `banner-card banner-card--${banner.tone || 'orange'}${
              hasImage ? ' banner-card--photo' : ''
            }`
            const inner = (
              <>
                {hasImage ? (
                  <img
                    className="banner-card__img"
                    src={banner.image!}
                    alt={banner.title || 'แบนเนอร์'}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                ) : null}
                {(banner.title || banner.subtitle) && (
                  <div className="banner-card__copy">
                    {banner.title ? <p className="banner-card__title">{banner.title}</p> : null}
                    {banner.subtitle ? (
                      <p className="banner-card__subtitle">{banner.subtitle}</p>
                    ) : null}
                    <span className="banner-card__cta">{ctaLabel}</span>
                  </div>
                )}
              </>
            )
            return banner.link ? (
              <Link
                key={banner.id}
                to={banner.link}
                className={className}
                aria-hidden={i !== index}
                tabIndex={i === index ? 0 : -1}
              >
                {inner}
              </Link>
            ) : (
              <article key={banner.id} className={className} aria-hidden={i !== index}>
                {inner}
              </article>
            )
          })}
        </div>
      </div>

      {count > 1 ? (
        <div className="banner-carousel__dots" role="tablist" aria-label="เลือกแบนเนอร์">
          {items.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`แบนเนอร์ที่ ${i + 1}`}
              className={i === index ? 'is-active' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
