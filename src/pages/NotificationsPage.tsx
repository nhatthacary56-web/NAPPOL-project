import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import './NotificationsPage.css'

const typeLabel: Record<string, string> = {
  order: 'ออเดอร์',
  chat: 'แชท',
  wallet: 'กระเป๋าเงิน',
  return: 'คืนสินค้า',
  system: 'ระบบ',
  help: 'ช่วยเหลือ',
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    refreshNotifications,
    markAllNotificationsRead,
    markNotificationRead,
    brand,
    user,
  } = useStore()

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications, user?.id])

  return (
    <main className="page notifications-page">
      <header className="notifications-page__head">
        <h1>การแจ้งเตือน</h1>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => void markAllNotificationsRead()}>
            อ่านทั้งหมด
          </button>
        ) : null}
      </header>
      {!user ? (
        <p className="notifications-page__empty">
          <Link to="/login">เข้าสู่ระบบ</Link> เพื่อดูการแจ้งเตือน
        </p>
      ) : notifications.length === 0 ? (
        <p className="notifications-page__empty">ยังไม่มีการแจ้งเตือนจาก {brand.name}</p>
      ) : (
        <ul className="notifications-page__list">
          {notifications.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`notification-item${item.read ? '' : ' is-unread'}`}
                onClick={async () => {
                  await markNotificationRead(item.id)
                  if (item.link) navigate(item.link)
                }}
              >
                <div className="notification-item__dot" aria-hidden="true" />
                <div>
                  <p className="notification-item__type">
                    {typeLabel[item.type] || item.type}
                  </p>
                  <p className="notification-item__title">{item.title}</p>
                  <p className="notification-item__body">{item.body}</p>
                  <p className="notification-item__time">
                    {new Date(item.createdAt).toLocaleString('th-TH')}
                    {item.link ? ' · แตะเพื่อเปิด' : ''}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
