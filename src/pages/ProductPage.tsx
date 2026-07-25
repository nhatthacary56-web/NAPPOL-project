import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice, formatSold } from '../data/catalog'
import { catalogApi, chatApi, reviewApi } from '../api'
import type { ApiProduct, ApiReview } from '../api/types'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './ProductPage.css'

export function ProductPage() {
  const { id = '' } = useParams()
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [reviews, setReviews] = useState<ApiReview[]>([])
  const [missing, setMissing] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [variantId, setVariantId] = useState('')
  const navigate = useNavigate()
  const { toast } = useToast()
  const {
    addToCart,
    prepareBuyNow,
    cartCount,
    toggleWishlist,
    isWishlisted,
    user,
  } = useStore()
  const { appContent, shipping } = useCatalog()

  useEffect(() => {
    void catalogApi
      .product(id)
      .then((res) => {
        setProduct(res.product)
        setActiveImage(0)
        setVariantId(res.product.variants?.[0]?.id || '')
      })
      .catch(() => setMissing(true))
    void reviewApi
      .list(id)
      .then((res) => setReviews(res.reviews))
      .catch(() => setReviews([]))
  }, [id])

  if (missing) {
    return (
      <div className="app-frame">
        <PageHeader title="สินค้า" backTo="/" />
        <main className="product-page product-page--empty">
          <p>ไม่พบสินค้านี้</p>
          <Link to="/">กลับหน้าแรก</Link>
        </main>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="app-frame">
        <PageHeader title="รายละเอียดสินค้า" backTo="/" />
        <main className="product-page product-page--empty">
          <p>กำลังโหลด...</p>
        </main>
      </div>
    )
  }

  const wishlisted = isWishlisted(product.id)
  const images =
    product.images && product.images.length > 0 ? product.images : [product.image]
  const selectedVariant = product.variants?.find((v) => v.id === variantId)
  const displayPrice = selectedVariant?.price ?? product.price
  const displayStock = selectedVariant ? selectedVariant.stock : (product.stock ?? 0)
  const outOfStock = displayStock <= 0

  function handleAddToCart() {
    if (outOfStock) {
      toast('สินค้าหมดแล้ว')
      return
    }
    if (product!.variants && product!.variants.length > 0 && !variantId) {
      toast('กรุณาเลือกตัวเลือกสินค้า')
      return
    }
    const variant = product!.variants?.find((v) => v.id === variantId)
    addToCart(
      product!.id,
      1,
      variant ? { id: variant.id, name: variant.name } : null,
    )
    toast(variant ? `เพิ่ม ${variant.name} ลงตะกร้าแล้ว` : 'เพิ่มลงตะกร้าแล้ว')
  }

  function handleBuyNow() {
    if (outOfStock) {
      toast('สินค้าหมดแล้ว')
      return
    }
    if (product!.variants && product!.variants.length > 0 && !variantId) {
      toast('กรุณาเลือกตัวเลือกสินค้า')
      return
    }
    const variant = product!.variants?.find((v) => v.id === variantId)
    prepareBuyNow(product!.id, variant ? { id: variant.id, name: variant.name } : null)
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ')
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  async function handleChat() {
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนแชท')
      navigate('/login', { state: { from: `/product/${product!.id}` } })
      return
    }
    try {
      const res = await chatApi.open({
        shopId: product!.shopId,
        productId: product!.id,
        message: `สนใจสินค้า: ${product!.name}`,
      })
      navigate(`/chats/${res.chatId}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'เปิดแชทไม่สำเร็จ')
    }
  }

  return (
    <div className="app-frame">
      <PageHeader
        title="รายละเอียดสินค้า"
        backTo="/"
        right={
          <Link to="/cart" className="product-page__cart-link" aria-label="ไปตะกร้า">
            🛒{cartCount > 0 ? <em>{cartCount}</em> : null}
          </Link>
        }
      />
      <main className="product-page">
        <div className="product-page__media">
          <img src={images[activeImage] || product.image} alt={product.name} />
          <button
            type="button"
            className={`product-page__wish${wishlisted ? ' is-active' : ''}`}
            onClick={async () => {
              try {
                await toggleWishlist(product.id)
                toast(wishlisted ? 'นำออกจากถูกใจแล้ว' : 'เพิ่มในถูกใจแล้ว')
              } catch (error) {
                toast(error instanceof Error ? error.message : 'กรุณาเข้าสู่ระบบ')
              }
            }}
          >
            {wishlisted ? '♥' : '♡'}
          </button>
        </div>
        {images.length > 1 ? (
          <div className="product-page__thumbs">
            {images.map((src, idx) => (
              <button
                key={`${src}-${idx}`}
                type="button"
                className={idx === activeImage ? 'is-active' : undefined}
                onClick={() => setActiveImage(idx)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        ) : null}
        <section className="product-page__info">
          <p className="price price--lg">{formatPrice(displayPrice)}</p>
          {product.originalPrice ? (
            <p className="product-page__old">{formatPrice(product.originalPrice)}</p>
          ) : null}
          <h1>{product.name}</h1>
          <div className="product-page__meta">
            <span>
              ★ {product.rating.toFixed(1)} ({product.reviewCount ?? reviews.length} รีวิว)
            </span>
            <span>ขายแล้ว {formatSold(product.sold)}</span>
            <span className={outOfStock ? 'is-out' : undefined}>
              {outOfStock ? 'สินค้าหมด' : `เหลือ ${displayStock} ชิ้น`}
            </span>
          </div>
          {product.variants && product.variants.length > 0 ? (
            <div className="product-page__variants">
              <p>ตัวเลือก</p>
              <div>
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className={v.id === variantId ? 'is-active' : undefined}
                    disabled={v.stock <= 0}
                    onClick={() => setVariantId(v.id)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {product.shopSlug ? (
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              ร้าน{' '}
              <Link to={`/shop/${product.shopSlug}`} style={{ color: 'var(--brand)' }}>
                {product.shopName}
              </Link>
            </p>
          ) : null}
        </section>
        {product.description ? (
          <section className="product-page__detail section">
            <h2>รายละเอียดสินค้า</h2>
            <p>{product.description}</p>
          </section>
        ) : null}
        <section className="product-page__similar section">
          <button
            type="button"
            className="product-page__similar-btn"
            onClick={() => navigate(`/search/visual?productId=${product.id}`)}
          >
            หาของคล้ายกันจากรูปนี้
          </button>
          <p>ไม่ถูกใจชิ้นนี้? สแกนโทนสี/สไตล์เพื่อหาตัวเลือกใกล้เคียงในร้าน</p>
        </section>
        <section className="product-page__ship section">
          <h2>การจัดส่ง</h2>
          <p>
            {appContent.productShippingTemplate
              .replace('{location}', product.location)
              .replace('{freeShippingMin}', String(shipping.freeShippingMin))}
          </p>
        </section>
        <section className="product-page__reviews-wrap section">
          <h2>รีวิวจากผู้ซื้อ</h2>
          {reviews.length === 0 ? (
            <p>ยังไม่มีรีวิว</p>
          ) : (
            <ul className="product-page__reviews">
              {reviews.map((review) => (
                <li key={review.id}>
                  <strong>
                    ★ {review.rating} · {review.userName}
                  </strong>
                  <p>{review.comment || '—'}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <footer className="product-page__footer">
        <button type="button" className="product-page__chat" onClick={() => void handleChat()}>
          แชท
        </button>
        <button
          type="button"
          className="product-page__cart"
          onClick={handleAddToCart}
          disabled={outOfStock}
        >
          ใส่รถเข็น
        </button>
        <button
          type="button"
          className="product-page__buy"
          onClick={handleBuyNow}
          disabled={outOfStock}
        >
          {outOfStock ? 'สินค้าหมด' : 'ซื้อเลย'}
        </button>
      </footer>
    </div>
  )
}
