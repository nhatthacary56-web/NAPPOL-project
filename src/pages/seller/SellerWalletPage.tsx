import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../../data/catalog'
import { orderApi, walletApi } from '../../api'
import type { ApiWallet, ApiWithdrawal } from '../../api/types'
import { useStore } from '../../store/StoreContext'
import { useToast } from '../../store/ToastContext'
import './SellerShell.css'

export function SellerWalletPage() {
  const { shop } = useStore()
  const { toast } = useToast()
  const [wallet, setWallet] = useState<ApiWallet | null>(null)
  const [withdrawals, setWithdrawals] = useState<ApiWithdrawal[]>([])
  const [rate, setRate] = useState(0.05)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [earnings, setEarnings] = useState<
    Array<{
      orderId: string
      createdAt: string
      settlementStatus: string
      gross: number
      fee: number
      net: number
    }>
  >([])
  const [earningTotals, setEarningTotals] = useState({ gross: 0, fee: 0, net: 0 })

  async function load() {
    const [res, earn] = await Promise.all([walletApi.mine(), orderApi.earnings()])
    setWallet(res.wallet)
    setWithdrawals(res.withdrawals)
    setRate(res.settings.commissionRate)
    setEarnings(earn.rows)
    setEarningTotals(earn.totals)
  }

  useEffect(() => {
    void load().catch((error) =>
      toast(error instanceof Error ? error.message : 'โหลดกระเป๋าเงินไม่สำเร็จ'),
    )
  }, [toast])

  async function onWithdraw(event: FormEvent) {
    event.preventDefault()
    try {
      await walletApi.withdraw(Number(amount), note)
      toast('ส่งคำขอถอนเงินแล้ว')
      setAmount('')
      setNote('')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ถอนไม่สำเร็จ')
    }
  }

  if (!wallet) {
    return (
      <div className="seller-page">
        <h1>กระเป๋าเงินร้าน</h1>
        <p className="seller-page__sub">เปิดร้านและรับออเดอร์ก่อน จึงจะมียอดในกระเป๋าเงิน</p>
      </div>
    )
  }

  return (
    <div className="seller-page">
      <h1>กระเป๋าเงินร้าน</h1>
      <p className="seller-page__sub">
        ค่าธรรมเนียมแพลตฟอร์ม {(rate * 100).toFixed(0)}% · เงินเข้าหลังลูกค้ายืนยันรับของ
      </p>

      <div className="seller-card seller-wallet-grid">
        <div>
          <span>ถอนได้</span>
          <strong>{formatPrice(wallet.balance)}</strong>
        </div>
        <div>
          <span>รอยืนยันรับของ</span>
          <strong>{formatPrice(wallet.pending)}</strong>
        </div>
        <div>
          <span>รายได้สะสม</span>
          <strong>{formatPrice(wallet.totalEarned)}</strong>
        </div>
        <div>
          <span>ถอนแล้ว</span>
          <strong>{formatPrice(wallet.totalWithdrawn)}</strong>
        </div>
      </div>

      <div className="seller-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>รายได้ต่อออเดอร์</h2>
        <p style={{ color: '#6b7280', fontSize: 13 }}>
          รวม gross {formatPrice(earningTotals.gross)} · ค่าคอม{' '}
          {formatPrice(earningTotals.fee)} · สุทธิ {formatPrice(earningTotals.net)}
        </p>
        {earnings.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีรายได้</p>
        ) : (
          <table className="seller-table">
            <thead>
              <tr>
                <th>ออเดอร์</th>
                <th>gross</th>
                <th>fee</th>
                <th>net</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {earnings.slice(0, 20).map((row) => (
                <tr key={row.orderId}>
                  <td>{row.orderId}</td>
                  <td>{formatPrice(row.gross)}</td>
                  <td>{formatPrice(row.fee)}</td>
                  <td>{formatPrice(row.net)}</td>
                  <td>{row.settlementStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="seller-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>บัญชีรับเงิน</h2>
        {shop?.bankName && shop.bankAccountNumber ? (
          <p style={{ margin: 0, color: '#374151', fontSize: 14 }}>
            {shop.bankName}
            <br />
            {shop.bankAccountName} · {shop.bankAccountNumber}
          </p>
        ) : (
          <p style={{ margin: 0, color: '#b45309' }}>
            ยังไม่มีบัญชีธนาคาร — <Link to="/seller/shop">ไปตั้งค่าร้าน</Link>
          </p>
        )}
      </div>

      <div className="seller-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>ขอถอนเงิน</h2>
        <form className="seller-form" onSubmit={onWithdraw}>
          <label>
            จำนวนเงิน (ขั้นต่ำ 100)
            <input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label>
            หมายเหตุเพิ่มเติม (ไม่บังคับ)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ระบบจะใช้บัญชีในตั้งค่าร้านอัตโนมัติ"
            />
          </label>
          <button type="submit" className="seller-btn">
            ส่งคำขอถอน
          </button>
        </form>
      </div>

      <div className="seller-card">
        <h2 style={{ marginTop: 0, fontSize: 16 }}>ประวัติถอนเงิน</h2>
        {withdrawals.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ยังไม่มีคำขอ</p>
        ) : (
          <table className="seller-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ยอด</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td>{new Date(w.createdAt).toLocaleString('th-TH')}</td>
                  <td>{formatPrice(w.amount)}</td>
                  <td>
                    {w.status === 'pending'
                      ? 'รออนุมัติ'
                      : w.status === 'approved'
                        ? 'อนุมัติแล้ว'
                        : 'ถูกปฏิเสธ'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
