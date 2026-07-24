import type { Product } from '../../data/catalog'
import type { ApiProduct } from '../../api/types'
import { ProductCard } from './ProductCard'
import './ProductGrid.css'

type ProductGridProps = {
  title?: string
  items: Array<Product | ApiProduct>
}

export function ProductGrid({ title = 'สินค้าแนะนำ', items }: ProductGridProps) {
  return (
    <section className="product-grid-section" aria-label={title}>
      {title ? (
        <div className="section-head product-grid-section__head">
          <h2 className="section-title">{title}</h2>
        </div>
      ) : null}
      <div className="product-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}
