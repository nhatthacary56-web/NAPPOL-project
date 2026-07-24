import { Link } from 'react-router-dom'
import type { Product } from '../../data/catalog'
import type { ApiProduct } from '../../api/types'
import { formatPrice, formatSold } from '../../data/catalog'
import './ProductCard.css'

type ProductCardProps = {
  product: Product | ApiProduct
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link to={`/product/${product.id}`} className="product-card">
      <div className="product-card__media">
        <img src={product.image} alt={product.name} loading="lazy" />
        {product.badge ? <span className="product-card__badge">{product.badge}</span> : null}
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">{product.name}</h3>
        <p className="price price--sm">{formatPrice(product.price)}</p>
        <div className="product-card__meta">
          <span>★ {product.rating.toFixed(1)}</span>
          <span>ขายแล้ว {formatSold(product.sold)}</span>
        </div>
        <p className="product-card__location">
          {product.shopName ? `${product.shopName} · ` : ''}
          {product.location}
        </p>
        {typeof product.stock === 'number' ? (
          <p className={`product-card__stock${product.stock <= 0 ? ' is-out' : ''}`}>
            {product.stock <= 0 ? 'สินค้าหมด' : `เหลือ ${product.stock} ชิ้น`}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
