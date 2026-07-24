import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { cartLineKey } from '../api/types'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './CartPage.css'

export function CartPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { getProductById } = useCatalog()
  const {
    cart,
    cartCount,
    cartSelectedTotal,
    setQty,
    toggleCartItem,
    toggleSelectAll,
    removeFromCart,
    user,
  } = useStore()

  const allSelected = cart.length > 0 && cart.every((item) => item.selected)
  const selectedCount = cart.filter((item) => item.selected).reduce((n, i) => n + i.qty, 0)

  const grouped = cart.reduce<Record<string, typeof cart>>((acc, item) => {
    const product = getProductById(item.productId)
    const shopName = product?.shopName || 'ร้านค้า'
    if (!acc[shopName]) acc[shopName] = []
    acc[shopName].push(item)
    return acc
  }, {})

  function goCheckout() {
    if (!selectedCount) {
      toast('เลือกสินค้าอย่างน้อย 1 ชิ้น')
      return
    }
    if (!user) {
      toast('กรุณาเข้าสู่ระบบก่อนสั่งซื้อ')
      navigate('/login', { state: { from: '/checkout' } })
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="app-frame">
      <PageHeader title={`ตะกร้าสินค้า (${cartCount})`} backTo="/" />
      <main className="cart-page">
        {cart.length === 0 ? (
          <div className="cart-page__empty">
            <p>ยังไม่มีสินค้าในตะกร้า</p>
            <Link to="/">เลือกซื้อสินค้า</Link>
          </div>
        ) : (
          <>
            <label className="cart-page__select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
              />
              เลือกทั้งหมด
            </label>
            {Object.entries(grouped).map(([shopName, lines]) => (
              <section key={shopName} className="cart-shop">
                <h2 className="cart-shop__title">{shopName}</h2>
                {lines.map((item) => {
                  const product = getProductById(item.productId)
                  if (!product) return null
                  const key = cartLineKey(item.productId, item.variantId)
                  const variant = item.variantId
                    ? product.variants?.find((v) => v.id === item.variantId)
                    : null
                  const price =
                    variant && variant.price != null ? Number(variant.price) : product.price
                  return (
                    <article key={key} className="cart-item">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleCartItem(key)}
                        aria-label={`เลือก ${product.name}`}
                      />
                      <img src={product.image} alt={product.name} />
                      <div className="cart-item__body">
                        <Link to={`/product/${product.id}`} className="cart-item__name">
                          {product.name}
                        </Link>
                        {item.variantName ? (
                          <p className="cart-item__variant">{item.variantName}</p>
                        ) : null}
                        <p className="price">{formatPrice(price)}</p>
                        <div className="cart-item__row">
                          <div className="cart-item__qty">
                            <button
                              type="button"
                              aria-label="ลดจำนวน"
                              onClick={() => setQty(key, item.qty - 1)}
                            >
                              −
                            </button>
                            <span>{item.qty}</span>
                            <button
                              type="button"
                              aria-label="เพิ่มจำนวน"
                              onClick={() => setQty(key, item.qty + 1)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className="cart-item__remove"
                            onClick={() => {
                              removeFromCart(key)
                              toast('ลบสินค้าออกจากตะกร้าแล้ว')
                            }}
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </section>
            ))}
          </>
        )}
      </main>
      {cart.length > 0 ? (
        <footer className="cart-page__footer">
          <div>
            <p>รวมทั้งหมด</p>
            <p className="price price--lg">{formatPrice(cartSelectedTotal)}</p>
          </div>
          <button type="button" className="cart-page__checkout" onClick={goCheckout}>
            สั่งซื้อ ({selectedCount})
          </button>
        </footer>
      ) : null}
    </div>
  )
}
