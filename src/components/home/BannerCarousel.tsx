import { Link } from 'react-router-dom'
import type { Banner } from '../../data/catalog'
import './BannerCarousel.css'

type BannerCarouselProps = {
  items: Banner[]
  ctaLabel?: string
}

export function BannerCarousel({ items, ctaLabel = 'ดูเลย' }: BannerCarouselProps) {
  return (
    <section className="banner-carousel" aria-label="โปรโมชัน">
      <div className="banner-carousel__track">
        {items.map((banner) => (
          <article key={banner.id} className={`banner-card banner-card--${banner.tone}`}>
            <p className="banner-card__title">{banner.title}</p>
            <p className="banner-card__subtitle">{banner.subtitle}</p>
            <Link to={banner.link || '/mall'} className="banner-card__cta">
              {ctaLabel}
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
