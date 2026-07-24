import { useParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { ProductGrid } from '../components/product/ProductGrid'
import { useCatalog } from '../store/CatalogContext'

export function CategoryPage() {
  const { slug = '' } = useParams()
  const { categories, getProductsByCategory } = useCatalog()
  const category = categories.find((item) => item.slug === slug)
  const items = getProductsByCategory(slug)

  return (
    <div className="app-frame">
      <PageHeader title={category?.name ?? 'หมวดหมู่'} backTo="/" />
      <main style={{ paddingBottom: 16 }}>
        {items.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
            ยังไม่มีสินค้าในหมวดนี้
          </p>
        ) : (
          <ProductGrid
            title={category ? `สินค้าในหมวด ${category.name}` : 'สินค้า'}
            items={items}
          />
        )}
      </main>
    </div>
  )
}
