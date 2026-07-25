import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { shopApi } from '../api'
import type { ApiProduct, ApiVoucher, Shop, ShopCategory } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { ProductGrid } from '../components/product/ProductGrid'
import { ShopCouponStrip } from '../components/shop/ShopCouponStrip'
import './ShopPage.css'

export function ShopPage() {
  const { slug = '' } = useParams()
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [vouchers, setVouchers] = useState<ApiVoucher[]>([])
  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([])
  const [activeCat, setActiveCat] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void shopApi
      .bySlug(slug, activeCat ? { shopCategory: activeCat } : undefined)
      .then((res) => {
        setShop(res.shop)
        setProducts(res.products)
        setShopCategories(res.shopCategories || res.shop.shopCategories || [])
        setVouchers(res.vouchers || [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'ไม่พบร้าน'))
  }, [slug, activeCat])

  return (
    <div className="app-frame">
      <PageHeader title={shop?.name ?? 'ร้านค้า'} backTo="/" />
      {error ? (
        <main style={{ padding: 24, textAlign: 'center' }}>
          <p>{error}</p>
          <Link to="/">กลับหน้าแรก</Link>
        </main>
      ) : (
        <main className="shop-page">
          <section
            className="shop-page__hero"
            style={
              shop?.coverUrl
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,.35), rgba(0,0,0,.55)), url(${shop.coverUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            <div className="shop-page__hero-row">
              {shop?.logoUrl ? (
                <img className="shop-page__logo" src={shop.logoUrl} alt="" />
              ) : (
                <div className="shop-page__logo shop-page__logo--fallback" aria-hidden>
                  {(shop?.name || 'S').slice(0, 1)}
                </div>
              )}
              <div>
                <h1>{shop?.name}</h1>
                <p>{shop?.description || 'ร้านค้าบน DeeJa'}</p>
                <p className="shop-page__loc">{shop?.location}</p>
              </div>
            </div>
            {shop?.vacationMode ? (
              <p className="shop-page__vacation" role="status">
                ร้านนี้อยู่ในโหมดพักร้อนชั่วคราว — สินค้าอาจไม่พร้อมสั่งซื้อ
              </p>
            ) : null}
          </section>

          <ShopCouponStrip vouchers={vouchers} />

          {shopCategories.length > 0 ? (
            <div className="shop-page__cats" role="tablist" aria-label="หมวดในร้าน">
              <button
                type="button"
                className={!activeCat ? 'is-active' : undefined}
                onClick={() => setActiveCat('')}
              >
                ทั้งหมด
              </button>
              {shopCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={activeCat === c.id ? 'is-active' : undefined}
                  onClick={() => setActiveCat(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : null}

          <ProductGrid
            title={
              activeCat
                ? shopCategories.find((c) => c.id === activeCat)?.name || 'สินค้าในร้าน'
                : 'สินค้าในร้าน'
            }
            items={products}
          />
        </main>
      )}
    </div>
  )
}
