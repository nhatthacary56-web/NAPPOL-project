import { Link } from 'react-router-dom'
import type { Category } from '../../data/catalog'
import './CategoryGrid.css'

type CategoryGridProps = {
  items: Category[]
}

export function CategoryGrid({ items }: CategoryGridProps) {
  return (
    <section className="category-grid section" aria-label="หมวดหมู่">
      <div className="category-grid__list">
        {items.map((category) => (
          <Link
            key={category.id}
            to={`/category/${category.slug}`}
            className="category-grid__item"
          >
            <span
              className="category-grid__icon"
              style={{ background: category.color }}
              aria-hidden="true"
            >
              {category.icon}
            </span>
            <span className="category-grid__name">{category.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
