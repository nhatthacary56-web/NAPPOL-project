import { Link } from 'react-router-dom'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { HomeHeader } from '../components/home/HomeHeader'
import { BannerCarousel } from '../components/home/BannerCarousel'
import { CategoryGrid } from '../components/home/CategoryGrid'
import { FlashSale } from '../components/home/FlashSale'
import { ProductGrid } from '../components/product/ProductGrid'
import './HomePage.css'

export function HomePage() {
  const { products, categories, banners, appContent } = useCatalog()
  const { brand } = useStore()
  const flashItems = products.filter((item) => {
    if (!item.flashSale) return false
    if (item.flashEndsAt && new Date(item.flashEndsAt).getTime() < Date.now()) return false
    return true
  })
  const shortcuts = [...(appContent.homeShortcuts || [])]
    .filter((s) => s.active !== false)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))

  return (
    <main className="page page--flush home-page">
      <HomeHeader />
      {appContent.home.showTagline && brand.tagline ? (
        <p className="home-page__tagline">{brand.tagline}</p>
      ) : null}
      <BannerCarousel items={banners} ctaLabel={appContent.bannerCta} />
      <CategoryGrid items={categories} />
      <div className="home-page__shortcuts">
        {shortcuts.map((item) => (
          <Link key={item.id} to={item.link || '/'} className="home-page__shortcut">
            <span>{item.icon}</span>
            <p>{item.label}</p>
          </Link>
        ))}
      </div>
      <FlashSale
        items={flashItems}
        title={appContent.flash.title}
        linkLabel={appContent.flash.linkLabel}
        link={appContent.flash.link}
      />
      <ProductGrid title={appContent.home.recommendedTitle} items={products} />
    </main>
  )
}
