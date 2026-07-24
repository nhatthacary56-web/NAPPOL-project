import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { chatApi } from '../api'
import type { ApiChatSummary } from '../api/types'
import { useStore } from '../store/StoreContext'
import './ChatPages.css'

export function ChatListPage() {
  const navigate = useNavigate()
  const { user, refreshChatUnread } = useStore()
  const [chats, setChats] = useState<ApiChatSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/chats' } })
      return
    }
    void chatApi
      .list()
      .then((res) => setChats(res.chats))
      .finally(() => setLoading(false))
    void refreshChatUnread()
  }, [user, navigate, refreshChatUnread])

  return (
    <div className="app-frame">
      <PageHeader title="แชท" backTo="/account" />
      <main className="chat-list">
        {loading ? <p className="chat-empty">กำลังโหลด...</p> : null}
        {!loading && chats.length === 0 ? (
          <p className="chat-empty">ยังไม่มีข้อความ — ทักร้านจากหน้าสินค้าได้เลย</p>
        ) : null}
        {chats.map((chat) => {
          const title = user?.id === chat.buyerId ? chat.shopName : chat.buyerName
          return (
            <Link key={chat.id} to={`/chats/${chat.id}`} className="chat-list__item">
              <div className="chat-list__avatar" aria-hidden="true">
                {title.slice(0, 1)}
              </div>
              <div className="chat-list__body">
                <div className="chat-list__row">
                  <strong>{title}</strong>
                  <time>
                    {chat.lastMessage
                      ? new Date(chat.lastMessage.createdAt).toLocaleDateString('th-TH')
                      : ''}
                  </time>
                </div>
                <p>
                  {chat.lastMessage?.body || 'เริ่มสนทนา'}
                  {chat.unread > 0 ? <i>{chat.unread}</i> : null}
                </p>
              </div>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
