import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../../store/StoreContext'
import './AppShell.css'

const tabs = [
  { to: '/', label: 'หน้าแรก', icon: HomeIcon, end: true },
  { to: '/mall', label: 'Mall', icon: MallIcon },
  { to: '/live', label: 'ฟีด', icon: LiveIcon },
  { to: '/notifications', label: 'แจ้งเตือน', icon: BellIcon, badge: true },
  { to: '/account', label: 'ฉัน', icon: UserIcon },
] as const

export function AppShell() {
  const { unreadCount } = useStore()

  return (
    <div className="app-frame">
      <Outlet />
      <nav className="bottom-nav" aria-label="เมนูหลัก">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={'end' in tab ? tab.end : false}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' is-active' : ''}`
            }
          >
            <span className="bottom-nav__icon-wrap">
              <tab.icon />
              {'badge' in tab && tab.badge && unreadCount > 0 ? (
                <em className="bottom-nav__badge">{unreadCount}</em>
              ) : null}
            </span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

function MallIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8h16v12H4V8Zm2-4h12l2 4H4l2-4Z" />
    </svg>
  )
}

function LiveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v3H4V5Zm0 5.5h16v3H4v-3ZM4 16h10v3H4v-3Z" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22Zm7-5.5V11a7 7 0 1 0-14 0v5.5L3 18v1h18v-1l-2-1.5Z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    </svg>
  )
}
