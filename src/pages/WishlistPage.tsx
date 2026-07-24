import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { ProductGrid } from '../components/product/ProductGrid'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'

export function WishlistPage() {
  const { wishlist } = useStore()
  const { products } = useCatalog()
  const items = products.filter((p) => wishlist.includes(p.id))

  return (
    <div className="app-frame">
      <PageHeader title="สินค้าที่ถูกใจ" backTo="/account" />
      <main style={{ paddingBottom: 16 }}>
        {items.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>ยังไม่มีสินค้าที่ถูกใจ</p>
            <Link to="/" style={{ color: 'var(--brand)', fontWeight: 600 }}>
              ไปเลือกสินค้า
            </Link>
          </div>
        ) : (
          <ProductGrid title={`ถูกใจ ${items.length} รายการ`} items={items} />
        )}
      </main>
    </div>
  )
}
