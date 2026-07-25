import { Link } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import './HomeHeader.css'

export function HomeHeader() {
  const { cartCount, brand, chatUnread } = useStore()

  return (
    <header className="home-header">
      <Link to="/search" className="home-header__search" aria-label="ค้นหาสินค้า">
        <SearchIcon />
        <span>ค้นหาใน {brand.name}</span>
      </Link>
      <div className="home-header__actions">
        <Link
          to="/search/visual"
          className="home-header__icon"
          aria-label="ค้นหาด้วยกล้อง"
          title="สแกนหาสินค้า"
        >
          <CameraIcon />
        </Link>
        <Link to="/cart" className="home-header__icon" aria-label="ตะกร้า">
          <CartIcon />
          {cartCount > 0 ? <span className="home-header__badge">{cartCount}</span> : null}
        </Link>
        <Link to="/chats" className="home-header__icon" aria-label="แชท">
          <ChatIcon />
          {chatUnread > 0 ? <span className="home-header__badge">{chatUnread}</span> : null}
        </Link>
      </div>
    </header>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm7.4 11.1 3.5 3.5-1.4 1.4-3.5-3.5 1.4-1.4Z"
      />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9 4h6l1.2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.8L9 4Zm3 4.5A4.5 4.5 0 1 0 16.5 13 4.5 4.5 0 0 0 12 8.5Zm0 2A2.5 2.5 0 1 1 9.5 13 2.5 2.5 0 0 1 12 10.5Z"
      />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 4h2.2l.7 2H20l-2.2 8.2a2 2 0 0 1-1.9 1.5H8.4a2 2 0 0 1-1.9-1.4L4.2 4H4Zm4.2 9h7.7l1.3-5H7.6l.6 5Z"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
      />
    </svg>
  )
}
