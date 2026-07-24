import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import './PageHeader.css'

type PageHeaderProps = {
  title: string
  backTo?: string
  right?: ReactNode
  tone?: 'light' | 'brand'
}

export function PageHeader({
  title,
  backTo = '/',
  right,
  tone = 'light',
}: PageHeaderProps) {
  return (
    <header className={`page-header page-header--${tone}`}>
      <Link to={backTo} className="page-header__back" aria-label="ย้อนกลับ">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M15.4 4.6 8 12l7.4 7.4 1.4-1.4L10.8 12l6-6-1.4-1.4Z"
          />
        </svg>
      </Link>
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__right">{right}</div>
    </header>
  )
}
