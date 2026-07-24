import { useCatalog } from '../store/CatalogContext'
import './LivePage.css'

export function LivePage() {
  const { appContent } = useCatalog()
  const lives = [...(appContent.lives || [])]
    .filter((item) => item.active !== false)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))

  return (
    <main className="page live-page">
      <header className="live-page__head">
        <h1>{appContent.livePage.title}</h1>
        <p>{appContent.livePage.subtitle}</p>
      </header>
      <div className="live-page__list">
        {lives.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '0 12px' }}>
            ยังไม่มีไลฟ์ — แอดมินเพิ่มได้ที่เมนูเนื้อหาแอป
          </p>
        ) : (
          lives.map((item) => (
            <article key={item.id} className="live-card">
              <div className="live-card__thumb">
                <span className="live-card__badge">LIVE</span>
                <span className="live-card__viewers">{item.viewers} กำลังดู</span>
              </div>
              <div className="live-card__body">
                <h2>{item.title}</h2>
                <p>{item.host}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  )
}
