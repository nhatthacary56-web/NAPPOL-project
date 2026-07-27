import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { paymentApi, walletApi } from '../api'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { cartLineKey } from '../api/types'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import type { ApiOrder } from '../api/types'
import './CheckoutPage.css'

type PayMethod = {
  id: ApiOrder['paymentMethod']
  name: string
  description: string
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { getProductById, shipping } = useCatalog()
  const { cart, addresses, defaultAddress, claimedVouchers, placeOrder } = useStore()

  const selectedItems = cart.filter((item) => item.selected)
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? '')
  const [paymentMethods, setPaymentMethods] = useState<PayMethod[]>([])
  const [paymentMethod, setPaymentMethod] = useState<ApiOrder['paymentMethod']>('cod')
  const [voucherCode, setVoucherCode] = useState('')
  const [walletBalance, setWalletBalance] = useState(0)
  const [codMaxAmount, setCodMaxAmount] = useState(0)

  useEffect(() => {
    if (!addressId && defaultAddress) setAddressId(defaultAddress.id)
  }, [addressId, defaultAddress])

  useEffect(() => {
    void paymentApi
      .methods()
      .then((res) => {
        const methods = (res.methods || []) as PayMethod[]
        setPaymentMethods(methods)
        if (methods.length && !methods.some((m) => m.id === paymentMethod)) {
          setPaymentMethod(methods[0].id)
        }
      })
      .catch(() => {
        setPaymentMethods([
          { id: 'cod', name: 'เก็บเงินปลายทาง', description: 'ชำระเมื่อได้รับสินค้า' },
          { id: 'transfer', name: 'สแกน QR / PromptPay', description: 'โอนแล้วกดยืนยัน' },
        ])
      })
    void walletApi
      .buyerMine()
      .then((res) => setWalletBalance(res.wallet.balance || 0))
      .catch(() => setWalletBalance(0))
    void walletApi
      .settings()
      .then((res) => setCodMaxAmount(Number(res.settings.codMaxAmount ?? 0)))
      .catch(() => setCodMaxAmount(0))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, [])

  const lines = useMemo(
    () =>
      selectedItems
        .map((item) => {
          const product = getProductById(item.productId)
          if (!product) return null
          const variant = item.variantId
            ? product.variants?.find((v) => v.id === item.variantId)
            : null
          const price =
            variant && variant.price != null ? Number(variant.price) : product.price
          return { ...item, product, price }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [selectedItems, getProductById],
  )

  const cartShopIds = useMemo(
    () => new Set(lines.map((line) => line.product.shopId).filter(Boolean)),
    [lines],
  )

  const usableVouchers = claimedVouchers.filter((v) => {
    if (v.used) return false
    if (v.scope === 'shop' && v.shopId) return cartShopIds.has(v.shopId)
    return true
  })

  const subtotal = lines.reduce((sum, item) => sum + item.price * item.qty, 0)
  const shippingFee = subtotal >= shipping.freeShippingMin ? 0 : shipping.shippingFee
  const voucher = usableVouchers.find((item) => item.code === voucherCode)

  const shopSubtotalForVoucher =
    voucher?.scope === 'shop' && voucher.shopId
      ? lines
          .filter((line) => line.product.shopId === voucher.shopId)
          .reduce((sum, item) => sum + item.price * item.qty, 0)
      : subtotal

  const meetsMin = voucher
    ? voucher.scope === 'shop'
      ? shopSubtotalForVoucher >= voucher.minSpend
      : subtotal >= voucher.minSpend
    : true
  const discount =
    voucher && meetsMin
      ? Math.min(
          voucher.discount,
          voucher.scope === 'shop' ? shopSubtotalForVoucher : subtotal + shippingFee,
        )
      : 0
  const total = Math.max(0, subtotal + shippingFee - discount)
  const codBlocked = codMaxAmount > 0 && total > codMaxAmount

  useEffect(() => {
    if (paymentMethod === 'cod' && codBlocked) {
      const alt = paymentMethods.find((m) => m.id !== 'cod')
      if (alt) setPaymentMethod(alt.id)
    }
  }, [codBlocked, paymentMethod, paymentMethods])

  async function submit() {
    if (!addresses.length || !addressId) {
      toast('กรุณาเพิ่มและเลือกที่อยู่จัดส่งก่อน')
      navigate('/addresses')
      return
    }
    if (paymentMethod === 'cod' && codBlocked) {
      toast(`เก็บเงินปลายทางใช้ได้ไม่เกิน ${formatPrice(codMaxAmount)} — เลือกสแกน QR`)
      return
    }
    if (voucherCode && voucher && !meetsMin) {
      toast(
        voucher.scope === 'shop'
          ? `คูปองร้านใช้เมื่อซื้อในร้านครบ ${formatPrice(voucher.minSpend)}`
          : `คูปองนี้ใช้เมื่อยอดครบ ${formatPrice(voucher.minSpend)}`,
      )
      return
    }
    const result = await placeOrder({
      addressId,
      paymentMethod,
      voucherCode: voucherCode || undefined,
    })
    toast(result.message)
    if (result.ok && result.orderId) {
      navigate(`/orders/${result.orderId}`, { replace: true })
    }
  }

  if (!lines.length) {
    return (
      <div className="app-frame">
        <PageHeader title="ชำระเงิน" backTo="/cart" />
        <main className="checkout-page checkout-page--empty">
          <p>ไม่มีสินค้าสำหรับชำระเงิน</p>
          <Link to="/cart">กลับไปตะกร้า</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="app-frame">
      <PageHeader title="ชำระเงิน" backTo="/cart" />
      <main className="checkout-page">
        <section className="checkout-card">
          <div className="checkout-card__head">
            <h2>ที่อยู่จัดส่ง</h2>
            <Link to="/addresses">จัดการ</Link>
          </div>
          {addresses.length === 0 ? (
            <p className="checkout-card__hint">
              ยังไม่มีที่อยู่ <Link to="/addresses">เพิ่มที่อยู่</Link>
            </p>
          ) : (
            <div className="checkout-address-list">
              {addresses.map((address) => (
                <label key={address.id} className="checkout-address">
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                  />
                  <span>
                    <strong>
                      {address.name} · {address.phone}
                    </strong>
                    <em>
                      {address.line1}, {address.district}, {address.province}{' '}
                      {address.postalCode}
                    </em>
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>

        <section className="checkout-card">
          <h2>สินค้า</h2>
          {lines.map((item) => (
            <div
              key={cartLineKey(item.productId, item.variantId)}
              className="checkout-line"
            >
              <img src={item.product.image} alt={item.product.name} />
              <div>
                <p>{item.product.name}</p>
                {item.variantName ? <p style={{ fontSize: 12 }}>{item.variantName}</p> : null}
                <span>
                  {formatPrice(item.price)} × {item.qty}
                </span>
              </div>
            </div>
          ))}
        </section>

        <section className="checkout-card">
          <h2>คูปอง</h2>
          <select value={voucherCode} onChange={(e) => setVoucherCode(e.target.value)}>
            <option value="">ไม่ใช้คูปอง</option>
            {usableVouchers.map((voucherItem) => (
              <option key={voucherItem.code} value={voucherItem.code}>
                {voucherItem.scope === 'shop' ? '[ร้าน] ' : ''}
                {voucherItem.title} ({voucherItem.code}) · ขั้นต่ำ{' '}
                {formatPrice(voucherItem.minSpend)}
                {voucherItem.shopName ? ` · ${voucherItem.shopName}` : ''}
              </option>
            ))}
          </select>
          {voucher && !meetsMin ? (
            <p className="checkout-card__hint">
              {voucher.scope === 'shop'
                ? `ยอดในร้านยังไม่ถึงขั้นต่ำ ${formatPrice(voucher.minSpend)}`
                : `ยอดยังไม่ถึงขั้นต่ำ ${formatPrice(voucher.minSpend)}`}{' '}
              — ยังใช้คูปองนี้ไม่ได้
            </p>
          ) : null}
        </section>

        <section className="checkout-card">
          <h2>วิธีชำระเงิน</h2>
          {walletBalance > 0 ? (
            <label className="checkout-pay">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'wallet'}
                onChange={() => setPaymentMethod('wallet')}
                disabled={walletBalance < total}
              />
              <span>
                กระเป๋าเงิน (ยอด {formatPrice(walletBalance)})
                <em style={{ display: 'block', fontSize: 12, color: '#6b7280', fontStyle: 'normal' }}>
                  {walletBalance < total
                    ? 'ยอดไม่พอสำหรับออเดอร์นี้'
                    : 'ใช้เงินคืนจากการยกเลิก/คืนสินค้า'}
                </em>
              </span>
            </label>
          ) : null}
          {paymentMethods.length === 0 && walletBalance <= 0 ? (
            <p className="checkout-card__hint">ยังไม่มีวิธีชำระเงินที่เปิดใช้งาน</p>
          ) : (
            paymentMethods.map((method) => {
              const blocked = method.id === 'cod' && codBlocked
              return (
                <label
                  key={method.id}
                  className="checkout-pay"
                  style={blocked ? { opacity: 0.55 } : undefined}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === method.id}
                    disabled={blocked}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  <span>
                    {method.name}
                    <em
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: '#6b7280',
                        fontStyle: 'normal',
                      }}
                    >
                      {blocked
                        ? `ใช้ได้ไม่เกิน ${formatPrice(codMaxAmount)} — ยอดนี้เกินเพดาน`
                        : method.description || ''}
                    </em>
                  </span>
                </label>
              )
            })
          )}
        </section>

        <section className="checkout-card">
          <div className="checkout-summary">
            <span>ยอดสินค้า</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="checkout-summary">
            <span>ค่าส่ง</span>
            <span>{formatPrice(shippingFee)}</span>
          </div>
          <div className="checkout-summary">
            <span>ส่วนลด</span>
            <span>-{formatPrice(discount)}</span>
          </div>
          <div className="checkout-summary checkout-summary--total">
            <span>ยอดชำระ</span>
            <span className="price">{formatPrice(total)}</span>
          </div>
        </section>
      </main>
      <footer className="checkout-page__footer">
        <div>
          <p>ยอดชำระ</p>
          <p className="price price--lg">{formatPrice(total)}</p>
        </div>
        <button type="button" onClick={() => void submit()} disabled={!addressId}>
          ยืนยันคำสั่งซื้อ
        </button>
      </footer>
    </div>
  )
}
