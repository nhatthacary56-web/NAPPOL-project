import { Link } from 'react-router-dom'
import { PageHeader } from '../components/layout/PageHeader'
import { defaultAppContent } from '../data/appContent'
import { useCatalog } from '../store/CatalogContext'
import './LegalPage.css'

const TITLES = {
  privacy: 'นโยบายความเป็นส่วนตัว',
  terms: 'ข้อกำหนดการใช้งาน',
  returnPolicy: 'นโยบายการคืนสินค้า',
} as const

export function LegalPage({ kind }: { kind: keyof typeof TITLES }) {
  const { appContent } = useCatalog()
  const legal = { ...defaultAppContent.legal, ...appContent.legal }
  const body = legal?.[kind] || 'ยังไม่มีเนื้อหา — แอดมินตั้งค่าได้ที่ เนื้อหาแอป → นโยบาย'

  return (
    <div className="app-frame">
      <PageHeader title={TITLES[kind]} backTo="/help" />
      <main className="legal-page">
        <article className="legal-page__card">
          <h1>{TITLES[kind]}</h1>
          <p className="legal-page__body">{body}</p>
        </article>
        <p className="legal-page__links">
          <Link to="/privacy">ความเป็นส่วนตัว</Link>
          <Link to="/terms">ข้อกำหนด</Link>
          <Link to="/returns-policy">คืนสินค้า</Link>
        </p>
      </main>
    </div>
  )
}
