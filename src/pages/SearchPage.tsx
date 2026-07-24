import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout/PageHeader'
import { ProductGrid } from '../components/product/ProductGrid'
import { useCatalog } from '../store/CatalogContext'
import './SearchPage.css'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const { searchProducts, appContent } = useCatalog()
  const results = useMemo(() => searchProducts(query), [query, searchProducts])

  return (
    <div className="app-frame">
      <PageHeader
        title="ค้นหา"
        backTo="/"
        tone="brand"
        right={
          <button type="button" className="search-page__clear" onClick={() => setQuery('')}>
            ล้าง
          </button>
        }
      />
      <div className="search-page__bar">
        <label className="sr-only" htmlFor="search-input">
          ค้นหาสินค้า
        </label>
        <input
          id="search-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={appContent.search.placeholder}
          autoFocus
        />
      </div>
      <main className="search-page">
        {results.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
            {query ? `ไม่พบสินค้าสำหรับ “${query}”` : 'ยังไม่มีสินค้า'}
          </p>
        ) : (
          <ProductGrid
            title={
              query ? `ผลลัพธ์สำหรับ “${query}”` : appContent.search.popularTitle
            }
            items={results}
          />
        )}
      </main>
    </div>
  )
}
