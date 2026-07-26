import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { walletApi } from '../api'
import type { ApiBuyerWallet, ApiWalletLedger } from '../api/types'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { useToast } from '../store/ToastContext'
import './BuyerWalletPage.css'

export function BuyerWalletPage() {
  const { toast } = useToast()
  const [wallet, setWallet] = useState<ApiBuyerWallet | null>(null)
  const [ledger, setLedger] = useState<ApiWalletLedger[]>([])

  useEffect(() => {
    void walletApi
      .buyerMine()
      .then((res) => {
        setWallet(res.wallet)
        setLedger(res.ledger)
      })
      .catch((error) => toast(error instanceof Error ? error.message : 'โหลดกระเป๋าไม่สำเร็จ'))
  }, [toast])

  return (
    <div className="app-frame">
      <PageHeader title="กระเป๋าเงิน" backTo="/account" />
      <main className="buyer-wallet">
        <section className="buyer-wallet__hero">
          <span>ยอดคงเหลือ</span>
          <strong>{formatPrice(wallet?.balance ?? 0)}</strong>
          <p>เงินคืนจากการยกเลิก / คืนสินค้า (จ่ายออนไลน์) จะเข้าที่นี่ ใช้ชำระออเดอร์ถัดไปได้</p>
        </section>

        <section className="buyer-wallet__stats">
          <div>
            <span>เข้าทั้งหมด</span>
            <strong>{formatPrice(wallet?.totalCredited ?? 0)}</strong>
          </div>
          <div>
            <span>ใช้ไปแล้ว</span>
            <strong>{formatPrice(wallet?.totalDebited ?? 0)}</strong>
          </div>
        </section>

        <div className="buyer-wallet__actions">
          <Link to="/checkout">ใช้ชำระที่หน้าชำระเงิน</Link>
          <Link to="/returns">คำขอคืนสินค้า</Link>
        </div>

        <section className="buyer-wallet__ledger">
          <h2>ประวัติล่าสุด</h2>
          {ledger.length === 0 ? (
            <p className="buyer-wallet__empty">ยังไม่มีรายการ</p>
          ) : (
            <ul>
              {ledger.map((row) => (
                <li key={row.id}>
                  <div>
                    <strong>{row.note || (row.type === 'credit' ? 'รับเงินเข้า' : 'ใช้จ่าย')}</strong>
                    <span>{new Date(row.createdAt).toLocaleString('th-TH')}</span>
                  </div>
                  <em className={row.type === 'credit' ? 'is-in' : 'is-out'}>
                    {row.type === 'credit' ? '+' : '-'}
                    {formatPrice(row.amount)}
                  </em>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
