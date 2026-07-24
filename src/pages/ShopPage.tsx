import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { shopApi } from '../api'
import type { ApiProduct, Shop } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { ProductGrid } from '../components/product/ProductGrid'

export function ShopPage() {
  const { slug = '' } = useParams()
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    void shopApi
      .bySlug(slug)
      .then((res) => {
        setShop(res.shop)
        setProducts(res.products)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'ไม่พบร้าน'))
  }, [slug])

  return (
    <div className="app-frame">
      <PageHeader title={shop?.name ?? 'ร้านค้า'} backTo="/" />
      {error ? (
        <main style={{ padding: 24, textAlign: 'center' }}>
          <p>{error}</p>
          <Link to="/">กลับหน้าแรก</Link>
        </main>
      ) : (
        <main style={{ paddingBottom: 16 }}>
          <section
            style={{
              padding: '20px 16px',
              background: 'var(--brand-grad)',
              color: '#fff',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 22 }}>{shop?.name}</h1>
            <p style={{ margin: '6px 0 0', opacity: 0.92, fontSize: 13 }}>
              {shop?.description || 'ร้านค้าบน Great App'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>
              {shop?.location}
            </p>
          </section>
          <ProductGrid title="สินค้าในร้าน" items={products} />
        </main>
      )}
    </div>
  )
}
