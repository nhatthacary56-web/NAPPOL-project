import { Link } from 'react-router-dom'
import { useCatalog } from '../store/CatalogContext'
import { ProductGrid } from '../components/product/ProductGrid'
import './MallPage.css'

export function MallPage() {
  const { products, categories, appContent } = useCatalog()
  const mall = appContent.mall
  const slugs = new Set(mall.categorySlugs || [])
  const mallProducts = products.filter(
    (item) =>
      (mall.badgeFilter && item.badge === mall.badgeFilter) ||
      slugs.has(item.categorySlug),
  )

  return (
    <main className="page mall-page">
      <header className="mall-page__hero">
        <p className="mall-page__brand">{mall.brandLabel}</p>
        <h1>{mall.title}</h1>
        <p className="mall-page__sub">{mall.subtitle}</p>
      </header>

      <section className="section mall-page__cats" aria-label="หมวด Mall">
        <div className="mall-page__cat-track">
          {categories.slice(0, 8).map((category) => (
            <Link key={category.id} to={`/category/${category.slug}`} className="mall-page__cat">
              <span style={{ background: category.color }}>{category.icon}</span>
              <em>{category.name}</em>
            </Link>
          ))}
        </div>
      </section>

      <ProductGrid
        title={mall.gridTitle}
        items={mallProducts.length ? mallProducts : products}
      />
    </main>
  )
}
