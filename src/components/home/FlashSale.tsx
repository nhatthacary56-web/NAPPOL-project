import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../../data/catalog'
import type { ApiProduct } from '../../api/types'
import { formatPrice } from '../../data/catalog'
import './FlashSale.css'

type FlashSaleProps = {
  items: Array<Product | ApiProduct>
  title?: string
  linkLabel?: string
  link?: string
}

function useCountdown(targetIso?: string | null) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!targetIso) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [targetIso])
  return useMemo(() => {
    if (!targetIso) return null
    const diff = new Date(targetIso).getTime() - now
    if (diff <= 0) return 'หมดเวลา'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [targetIso, now])
}

export function FlashSale({
  items,
  title = 'FLASH SALE',
  linkLabel = 'ดูทั้งหมด ›',
  link = '/mall',
}: FlashSaleProps) {
  const endsAt = items
    .map((item) => ('flashEndsAt' in item ? item.flashEndsAt : null))
    .filter(Boolean)
    .sort()[0] as string | undefined
  const countdown = useCountdown(endsAt)

  if (!items.length) return null
  return (
    <section className="flash-sale section" aria-label={title}>
      <div className="section-head">
        <h2 className="section-title">
          <BoltIcon />
          {title}
          {countdown ? <em className="flash-sale__timer">{countdown}</em> : null}
        </h2>
        <Link to={link} className="section-link">
          {linkLabel}
        </Link>
      </div>
      <div className="flash-sale__track">
        {items.map((product) => (
          <Link key={product.id} to={`/product/${product.id}`} className="flash-sale__item">
            <div className="flash-sale__image-wrap">
              <img src={product.image} alt={product.name} loading="lazy" />
              {product.originalPrice ? (
                <span className="flash-sale__discount">
                  -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                </span>
              ) : null}
            </div>
            <p className="price price--sm">{formatPrice(product.price)}</p>
            {product.originalPrice ? (
              <p className="flash-sale__old">{formatPrice(product.originalPrice)}</p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  )
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M13 2 4 14h7l-1 8 10-14h-7l0-6Z" />
    </svg>
  )
}
