import { Link } from 'react-router-dom'
import type { Banner } from '../../data/catalog'
import './BannerCarousel.css'

type BannerCarouselProps = {
  items: Banner[]
  ctaLabel?: string
}

export function BannerCarousel({ items, ctaLabel = 'ดูเลย' }: BannerCarouselProps) {
  if (!items.length) return null

  return (
    <section className="banner-carousel" aria-label="โปรโมชัน">
      <div className="banner-carousel__track">
        {items.map((banner) => {
          const hasImage = Boolean(banner.image)
          const inner = (
            <>
              {hasImage ? (
                <img className="banner-card__img" src={banner.image!} alt="" loading="lazy" />
              ) : null}
              <div className="banner-card__copy">
                {banner.title ? <p className="banner-card__title">{banner.title}</p> : null}
                {banner.subtitle ? (
                  <p className="banner-card__subtitle">{banner.subtitle}</p>
                ) : null}
                <span className="banner-card__cta">{ctaLabel}</span>
              </div>
            </>
          )
          const className = `banner-card banner-card--${banner.tone || 'orange'}${
            hasImage ? ' banner-card--photo' : ''
          }`
          return banner.link ? (
            <Link key={banner.id} to={banner.link} className={className}>
              {inner}
            </Link>
          ) : (
            <article key={banner.id} className={className}>
              {inner}
            </article>
          )
        })}
      </div>
    </section>
  )
}
