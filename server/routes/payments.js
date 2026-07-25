import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

const METHOD_META = {
  cod: {
    id: 'cod',
    name: 'เก็บเงินปลายทาง',
    description: 'ชำระเมื่อได้รับสินค้า',
  },
  transfer: {
    id: 'transfer',
    name: 'PromptPay / โอนธนาคาร',
    description: 'สแกน QR หรือโอนเข้าบัญชีแพลตฟอร์ม',
  },
  card: {
    id: 'card',
    name: 'บัตรเครดิต/เดบิต (จำลอง)',
    description: 'ชำระผ่านเกตเวย์จำลองทันที',
  },
}

router.get('/methods', requireAuth, (_req, res) => {
  const db = getDb()
  const s = db.settings
  const flags = s.paymentMethods || { cod: true, transfer: true, card: true }
  const methods = []
  for (const key of ['cod', 'transfer', 'card']) {
    if (flags[key] === false) continue
    const base = METHOD_META[key]
    if (key === 'transfer') {
      methods.push({
        ...base,
        promptPayPhone: s.promptPayPhone,
        bankAccount: s.bankAccount,
      })
    } else {
      methods.push({ ...base })
    }
  }
  res.json({ ok: true, methods })
})

export default router
