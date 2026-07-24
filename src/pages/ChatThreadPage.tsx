import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { formatPrice } from '../data/catalog'
import { chatApi } from '../api'
import type { ApiChatMessage } from '../api/types'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './ChatPages.css'

export function ChatThreadPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, refreshChatUnread } = useStore()
  const [title, setTitle] = useState('แชท')
  const [messages, setMessages] = useState<ApiChatMessage[]>([])
  const [product, setProduct] = useState<{
    id: string
    name: string
    image: string
    price: number
  } | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await chatApi.get(id)
    setMessages(res.chat.messages)
    setProduct(res.chat.product)
    setOrderId(res.chat.orderId || null)
    setTitle(user?.id === res.chat.buyerId ? res.chat.shopName : res.chat.buyerName)
    await chatApi.read(id)
    await refreshChatUnread()
  }, [id, user?.id, refreshChatUnread])

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: `/chats/${id}` } })
      return
    }
    void load().catch(() => {
      toast('โหลดแชทไม่สำเร็จ')
      navigate('/chats')
    })
    const timer = window.setInterval(() => {
      void load().catch(() => undefined)
    }, 4000)
    return () => window.clearInterval(timer)
  }, [user, id, load, navigate, toast])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function onSend(event: FormEvent) {
    event.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await chatApi.send(id, text.trim())
      setText('')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ส่งไม่สำเร็จ')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="app-frame chat-thread-frame">
      <PageHeader title={title} backTo="/chats" />
      <main className="chat-thread">
        {product ? (
          <Link to={`/product/${product.id}`} className="chat-thread__product">
            <img src={product.image} alt="" />
            <div>
              <p>{product.name}</p>
              <span>{formatPrice(product.price)}</span>
            </div>
          </Link>
        ) : null}
        {orderId ? (
          <Link to={`/orders/${orderId}`} className="chat-thread__product">
            <div>
              <p>ออเดอร์ที่เกี่ยวข้อง</p>
              <span>{orderId}</span>
            </div>
          </Link>
        ) : null}

        <div className="chat-thread__msgs">
          {messages.map((msg) => {
            const mine = msg.senderId === user?.id
            return (
              <div key={msg.id} className={`chat-bubble${mine ? ' is-mine' : ''}`}>
                <p>{msg.body}</p>
                <time>{new Date(msg.createdAt).toLocaleTimeString('th-TH')}</time>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form className="chat-thread__composer" onSubmit={onSend}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="พิมพ์ข้อความ..."
            maxLength={1000}
          />
          <button type="submit" disabled={sending || !text.trim()}>
            ส่ง
          </button>
        </form>
      </main>
    </div>
  )
}
