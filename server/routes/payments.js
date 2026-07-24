import { Router } from 'express'
import { getDb } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

router.get('/methods', requireAuth, (_req, res) => {
  const db = getDb()
  const s = db.settings
  res.json({
    ok: true,
    methods: [
      {
        id: 'cod',
        name: 'เก็บเงินปลายทาง',
        description: 'ชำระเมื่อได้รับสินค้า',
      },
      {
        id: 'transfer',
        name: 'PromptPay / โอนธนาคาร',
        description: 'สแกน QR หรือโอนเข้าบัญชีแพลตฟอร์ม',
        promptPayPhone: s.promptPayPhone,
        bankAccount: s.bankAccount,
      },
      {
        id: 'card',
        name: 'บัตรเครดิต/เดบิต (จำลอง)',
        description: 'ชำระผ่านเกตเวย์จำลองทันที',
      },
    ],
  })
})

export default router
