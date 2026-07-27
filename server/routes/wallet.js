import { Router } from 'express'
import {
  createId,
  getBuyerWallet,
  getDb,
  getShopByOwner,
  getWallet,
  persist,
  pushNotification,
} from '../db.js'
import { requireAuth, requireRole } from '../auth.js'

const router = Router()

/** กระเป๋าเงินลูกค้า — รับเงินคืนจากยกเลิก/คืนสินค้า */
router.get('/buyer/mine', requireAuth, (req, res) => {
  const db = getDb()
  const wallet = getBuyerWallet(req.user.id)
  const ledger = (db.walletLedger || [])
    .filter((row) => row.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 50)
  res.json({ ok: true, wallet, ledger })
})

router.get('/buyer/admin', requireRole('admin'), (_req, res) => {
  const db = getDb()
  const wallets = [...(db.buyerWallets || [])].sort((a, b) => b.balance - a.balance)
  const ledger = [...(db.walletLedger || [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100)
  const users = Object.fromEntries(db.users.map((u) => [u.id, u]))
  res.json({
    ok: true,
    wallets: wallets.map((w) => ({
      ...w,
      userName: users[w.userId]?.name || w.userId,
      userEmail: users[w.userId]?.email || '',
    })),
    ledger: ledger.map((row) => ({
      ...row,
      userName: users[row.userId]?.name || row.userId,
    })),
  })
})

router.get('/mine', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop && req.user.role !== 'admin') {
    return res.json({
      ok: true,
      wallet: null,
      withdrawals: [],
      settings: getDb().settings,
    })
  }

  const db = getDb()
  const targetShopId = shop?.id || req.query.shopId
  if (!targetShopId) {
    return res.json({
      ok: true,
      wallet: null,
      withdrawals: [],
      settings: db.settings,
    })
  }

  const wallet = getWallet(targetShopId)
  const withdrawals = db.withdrawals
    .filter((w) => w.shopId === targetShopId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  res.json({
    ok: true,
    wallet,
    withdrawals,
    settings: {
      commissionRate: db.settings.commissionRate,
    },
  })
})

router.post('/withdraw', requireRole('seller', 'admin'), (req, res) => {
  const shop = getShopByOwner(req.user.id)
  if (!shop) return res.status(400).json({ ok: false, message: 'ยังไม่มีร้าน' })

  const amount = Math.floor(Number(req.body?.amount) || 0)
  if (amount < 100) {
    return res.status(400).json({ ok: false, message: 'ถอนขั้นต่ำ ฿100' })
  }

  const wallet = getWallet(shop.id)
  if (amount > wallet.balance) {
    return res.status(400).json({ ok: false, message: 'ยอดเงินไม่พอถอน' })
  }

  if (!shop.bankName || !shop.bankAccountNumber || !shop.bankAccountName) {
    return res.status(400).json({
      ok: false,
      message: 'กรุณาบันทึกบัญชีธนาคารในตั้งค่าร้านก่อนถอนเงิน',
    })
  }

  wallet.balance -= amount
  const bankLine = `${shop.bankName} · ${shop.bankAccountName} · ${shop.bankAccountNumber}`
  const withdrawal = {
    id: createId('wd'),
    shopId: shop.id,
    shopName: shop.name,
    amount,
    status: 'pending',
    note: String(req.body?.note || '').trim() || bankLine,
    bankName: shop.bankName,
    bankAccountName: shop.bankAccountName,
    bankAccountNumber: shop.bankAccountNumber,
    createdAt: new Date().toISOString(),
    processedAt: null,
  }
  getDb().withdrawals.unshift(withdrawal)

  const admins = getDb().users.filter((u) => u.role === 'admin')
  for (const admin of admins) {
    pushNotification(admin.id, {
      type: 'wallet',
      title: 'คำขอถอนเงิน',
      body: `${shop.name} ขอถอน ฿${amount.toLocaleString('th-TH')}`,
    })
  }

  persist()
  res.status(201).json({ ok: true, withdrawal, wallet })
})

router.get('/withdrawals', requireRole('admin'), (_req, res) => {
  const db = getDb()
  const withdrawals = [...db.withdrawals].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )
  res.json({ ok: true, withdrawals })
})

router.patch('/withdrawals/:id', requireRole('admin'), (req, res) => {
  const db = getDb()
  const item = db.withdrawals.find((w) => w.id === req.params.id)
  if (!item) return res.status(404).json({ ok: false, message: 'ไม่พบคำขอ' })
  if (item.status !== 'pending') {
    return res.status(400).json({ ok: false, message: 'คำขอนี้ดำเนินการแล้ว' })
  }

  const status = req.body?.status
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ ok: false, message: 'สถานะไม่ถูกต้อง' })
  }

  const wallet = getWallet(item.shopId)
  if (status === 'approved') {
    wallet.totalWithdrawn += item.amount
    item.status = 'approved'
  } else {
    wallet.balance += item.amount
    item.status = 'rejected'
  }
  item.processedAt = new Date().toISOString()
  item.adminNote = String(req.body?.note || '').trim()

  const shop = db.shops.find((s) => s.id === item.shopId)
  if (shop) {
    pushNotification(shop.ownerId, {
      type: 'wallet',
      title: status === 'approved' ? 'อนุมัติถอนเงินแล้ว' : 'ปฏิเสธคำขอถอนเงิน',
      body: `ยอด ฿${item.amount.toLocaleString('th-TH')}`,
    })
  }

  persist()
  res.json({ ok: true, withdrawal: item, wallet })
})

router.get('/settings', requireAuth, (_req, res) => {
  const db = getDb()
  res.json({
    ok: true,
    settings: {
      commissionRate: db.settings.commissionRate,
      promptPayPhone: db.settings.promptPayPhone,
      bankAccount: db.settings.bankAccount,
      freeShippingMin: db.settings.freeShippingMin ?? 199,
      shippingFee: db.settings.shippingFee ?? 40,
      paymentMethods: {
        cod: db.settings.paymentMethods?.cod !== false,
        transfer: db.settings.paymentMethods?.transfer !== false,
        card: false,
      },
      carriers: Array.isArray(db.settings.carriers) ? db.settings.carriers : [],
      defaultCarrier: db.settings.defaultCarrier || 'Kerry Express',
    },
  })
})

router.put('/settings', requireRole('admin'), (req, res) => {
  const db = getDb()
  const { commissionRate, promptPayPhone, bankAccount, paymentMethods, carriers, defaultCarrier } =
    req.body ?? {}
  if (commissionRate !== undefined) {
    const rate = Number(commissionRate)
    if (Number.isNaN(rate) || rate < 0 || rate > 0.3) {
      return res.status(400).json({ ok: false, message: 'ค่าคอมมิชชันต้องอยู่ระหว่าง 0–30%' })
    }
    db.settings.commissionRate = rate
  }
  if (promptPayPhone !== undefined) {
    db.settings.promptPayPhone = String(promptPayPhone).trim()
  }
  if (req.body?.freeShippingMin !== undefined) {
    db.settings.freeShippingMin = Math.max(0, Number(req.body.freeShippingMin) || 0)
  }
  if (req.body?.shippingFee !== undefined) {
    db.settings.shippingFee = Math.max(0, Number(req.body.shippingFee) || 0)
  }
  if (bankAccount) {
    db.settings.bankAccount = {
      bank: String(bankAccount.bank || db.settings.bankAccount.bank).trim(),
      accountName: String(bankAccount.accountName || db.settings.bankAccount.accountName).trim(),
      accountNumber: String(
        bankAccount.accountNumber || db.settings.bankAccount.accountNumber,
      ).trim(),
    }
  }
  if (paymentMethods && typeof paymentMethods === 'object') {
    const next = {
      cod: paymentMethods.cod !== false,
      transfer: paymentMethods.transfer !== false,
      card: false,
    }
    if (!next.cod && !next.transfer) {
      return res.status(400).json({
        ok: false,
        message: 'ต้องเปิดอย่างน้อย 1 วิธี: เก็บเงินปลายทาง หรือ QR/โอน',
      })
    }
    db.settings.paymentMethods = next
  }
  if (Array.isArray(carriers)) {
    const list = carriers.map((c) => String(c || '').trim()).filter(Boolean)
    if (list.length === 0) {
      return res.status(400).json({ ok: false, message: 'ต้องมีอย่างน้อย 1 ขนส่ง' })
    }
    db.settings.carriers = list
    if (!list.includes(db.settings.defaultCarrier)) {
      db.settings.defaultCarrier = list[0]
    }
  }
  if (defaultCarrier !== undefined) {
    const name = String(defaultCarrier).trim()
    const list = db.settings.carriers || []
    if (name && list.includes(name)) db.settings.defaultCarrier = name
    else if (name) {
      return res.status(400).json({ ok: false, message: 'defaultCarrier ต้องอยู่ในรายการ carriers' })
    }
  }
  persist()
  res.json({ ok: true, settings: db.settings })
})

export default router
