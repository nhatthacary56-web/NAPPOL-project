import { useEffect, useState, type FormEvent } from 'react'
import { metaApi, walletApi } from '../../api'
import type { AppContent } from '../../api/types'
import { defaultAppContent } from '../../data/appContent'
import { useCatalog } from '../../store/CatalogContext'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

export function AdminAppContentPage() {
  const { toast } = useToast()
  const { refreshAppContent, refreshShipping } = useCatalog()
  const [content, setContent] = useState<AppContent>(defaultAppContent)
  const [freeShippingMin, setFreeShippingMin] = useState(199)
  const [shippingFee, setShippingFee] = useState(40)
  const [section, setSection] = useState<
    'shipping' | 'home' | 'mall' | 'live' | 'copy' | 'auth' | 'help'
  >('shipping')

  useEffect(() => {
    void Promise.all([metaApi.appContent(), metaApi.storefrontSettings()])
      .then(([c, s]) => {
        setContent({
          ...defaultAppContent,
          ...c.appContent,
          help: {
            ...defaultAppContent.help,
            ...c.appContent.help,
            channels: c.appContent.help?.channels ?? defaultAppContent.help.channels,
            topics: c.appContent.help?.topics ?? defaultAppContent.help.topics,
          },
        })
        setFreeShippingMin(s.settings.freeShippingMin ?? 199)
        setShippingFee(s.settings.shippingFee ?? 40)
      })
      .catch((e) => toast(e instanceof Error ? e.message : 'โหลดไม่สำเร็จ'))
  }, [toast])

  async function saveContent(event?: FormEvent) {
    event?.preventDefault()
    try {
      const res = await metaApi.updateAppContent(content)
      setContent(res.appContent)
      await refreshAppContent()
      toast('บันทึกเนื้อหาแอปแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  async function saveShipping(event: FormEvent) {
    event.preventDefault()
    try {
      await walletApi.updateSettings({ freeShippingMin, shippingFee })
      await refreshShipping()
      toast('บันทึกค่าส่งแล้ว')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ')
    }
  }

  const tabs = [
    { id: 'shipping' as const, label: '1. ค่าส่ง', hint: 'กฎส่งฟรี / ค่าส่ง' },
    { id: 'home' as const, label: '2. หน้าแรก', hint: 'ทางลัด + Flash + สินค้าแนะนำ' },
    { id: 'mall' as const, label: '3. Mall', hint: 'หัวข้อและเงื่อนไขคัดสินค้า' },
    { id: 'live' as const, label: '4. Live', hint: 'รายการไลฟ์ตัวอย่าง' },
    { id: 'copy' as const, label: '5. ข้อความ', hint: 'ค้นหา / ค่าส่งสินค้า / CTA' },
    { id: 'auth' as const, label: '6. ล็อกอิน', hint: 'ข้อความหน้าเข้าสู่ระบบ' },
    { id: 'help' as const, label: '7. ช่วยเหลือ', hint: 'LINE / ช่องทาง + ข้อความฟอร์ม' },
  ]

  return (
    <div className="admin-page">
      <h1>เนื้อหาและลูกเล่นหน้าแอป</h1>
      <p className="admin-page__sub">
        คุมข้อความ · ทางลัด · Mall · Live · ค่าส่ง ที่ลูกค้าเห็น — ไม่ต้องแก้โค้ด
        (แบนเนอร์ / หมวด / Flash สินค้า / แบรนด์ ยังอยู่ในเมนูแยก)
      </p>

      <div className="admin-content-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={section === tab.id ? 'is-active' : undefined}
            onClick={() => setSection(tab.id)}
          >
            <strong>{tab.label}</strong>
            <span>{tab.hint}</span>
          </button>
        ))}
      </div>

      {section === 'shipping' ? (
        <form className="admin-card admin-form" onSubmit={saveShipping}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>กฎค่าส่ง (ใช้ทั้งแอป + ตอนคิดเงิน)</h2>
          <div className="admin-form-grid">
            <label>
              ส่งฟรีเมื่อครบ (บาท)
              <input
                type="number"
                min={0}
                value={freeShippingMin}
                onChange={(e) => setFreeShippingMin(Number(e.target.value))}
              />
            </label>
            <label>
              ค่าส่งปกติ (บาท)
              <input
                type="number"
                min={0}
                value={shippingFee}
                onChange={(e) => setShippingFee(Number(e.target.value))}
              />
            </label>
          </div>
          <button type="submit" className="admin-btn">
            บันทึกค่าส่ง
          </button>
        </form>
      ) : null}

      {section === 'home' ? (
        <form className="admin-card admin-form" onSubmit={saveContent}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>ทางลัด 4 ช่องใต้แบนเนอร์</h2>
          {content.homeShortcuts.map((item, idx) => (
            <div key={item.id} className="admin-form-grid" style={{ marginBottom: 8 }}>
              <label>
                ไอคอน
                <input
                  value={item.icon}
                  onChange={(e) => {
                    const next = [...content.homeShortcuts]
                    next[idx] = { ...item, icon: e.target.value }
                    setContent({ ...content, homeShortcuts: next })
                  }}
                />
              </label>
              <label>
                ข้อความ
                <input
                  value={item.label}
                  onChange={(e) => {
                    const next = [...content.homeShortcuts]
                    next[idx] = { ...item, label: e.target.value }
                    setContent({ ...content, homeShortcuts: next })
                  }}
                />
              </label>
              <label>
                ลิงก์
                <input
                  value={item.link}
                  onChange={(e) => {
                    const next = [...content.homeShortcuts]
                    next[idx] = { ...item, link: e.target.value }
                    setContent({ ...content, homeShortcuts: next })
                  }}
                />
              </label>
              <label>
                เปิดใช้
                <select
                  value={item.active === false ? '0' : '1'}
                  onChange={(e) => {
                    const next = [...content.homeShortcuts]
                    next[idx] = { ...item, active: e.target.value === '1' }
                    setContent({ ...content, homeShortcuts: next })
                  }}
                >
                  <option value="1">เปิด</option>
                  <option value="0">ปิด</option>
                </select>
              </label>
            </div>
          ))}

          <h2 style={{ fontSize: 16 }}>Flash Sale / สินค้าแนะนำ</h2>
          <div className="admin-form-grid">
            <label>
              หัวข้อ Flash
              <input
                value={content.flash.title}
                onChange={(e) =>
                  setContent({ ...content, flash: { ...content.flash, title: e.target.value } })
                }
              />
            </label>
            <label>
              ปุ่ม Flash
              <input
                value={content.flash.linkLabel}
                onChange={(e) =>
                  setContent({
                    ...content,
                    flash: { ...content.flash, linkLabel: e.target.value },
                  })
                }
              />
            </label>
            <label>
              ลิงก์ Flash
              <input
                value={content.flash.link}
                onChange={(e) =>
                  setContent({ ...content, flash: { ...content.flash, link: e.target.value } })
                }
              />
            </label>
            <label>
              หัวข้อสินค้าแนะนำ
              <input
                value={content.home.recommendedTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    home: { ...content.home, recommendedTitle: e.target.value },
                  })
                }
              />
            </label>
            <label>
              แสดงสโลแกนแบรนด์ใต้หัวข้อค้นหา
              <select
                value={content.home.showTagline ? '1' : '0'}
                onChange={(e) =>
                  setContent({
                    ...content,
                    home: { ...content.home, showTagline: e.target.value === '1' },
                  })
                }
              >
                <option value="1">แสดง</option>
                <option value="0">ซ่อน</option>
              </select>
            </label>
          </div>
          <button type="submit" className="admin-btn">
            บันทึกหน้าแรก
          </button>
        </form>
      ) : null}

      {section === 'mall' ? (
        <form className="admin-card admin-form" onSubmit={saveContent}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>หน้า Mall</h2>
          <div className="admin-form-grid">
            <label>
              ชื่อแบรนด์ Mall
              <input
                value={content.mall.brandLabel}
                onChange={(e) =>
                  setContent({
                    ...content,
                    mall: { ...content.mall, brandLabel: e.target.value },
                  })
                }
              />
            </label>
            <label>
              หัวข้อใหญ่
              <input
                value={content.mall.title}
                onChange={(e) =>
                  setContent({ ...content, mall: { ...content.mall, title: e.target.value } })
                }
              />
            </label>
            <label>
              คำอธิบาย
              <input
                value={content.mall.subtitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    mall: { ...content.mall, subtitle: e.target.value },
                  })
                }
              />
            </label>
            <label>
              หัวข้อกริดสินค้า
              <input
                value={content.mall.gridTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    mall: { ...content.mall, gridTitle: e.target.value },
                  })
                }
              />
            </label>
            <label>
              กรองจาก badge สินค้า
              <input
                value={content.mall.badgeFilter}
                onChange={(e) =>
                  setContent({
                    ...content,
                    mall: { ...content.mall, badgeFilter: e.target.value },
                  })
                }
                placeholder="Mall"
              />
            </label>
            <label>
              หรือหมวด (คั่นด้วยจุลภาค)
              <input
                value={content.mall.categorySlugs.join(',')}
                onChange={(e) =>
                  setContent({
                    ...content,
                    mall: {
                      ...content.mall,
                      categorySlugs: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                placeholder="electronics,beauty"
              />
            </label>
          </div>
          <button type="submit" className="admin-btn">
            บันทึก Mall
          </button>
        </form>
      ) : null}

      {section === 'live' ? (
        <form className="admin-card admin-form" onSubmit={saveContent}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>หน้า Live</h2>
          <div className="admin-form-grid">
            <label>
              หัวข้อหน้า
              <input
                value={content.livePage.title}
                onChange={(e) =>
                  setContent({
                    ...content,
                    livePage: { ...content.livePage, title: e.target.value },
                  })
                }
              />
            </label>
            <label>
              คำอธิบาย
              <input
                value={content.livePage.subtitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    livePage: { ...content.livePage, subtitle: e.target.value },
                  })
                }
              />
            </label>
          </div>
          <h3 style={{ fontSize: 14 }}>รายการไลฟ์ (แก้ได้ / เพิ่มแถว)</h3>
          {content.lives.map((live, idx) => (
            <div key={live.id} className="admin-form-grid" style={{ marginBottom: 8 }}>
              <label>
                ชื่อไลฟ์
                <input
                  value={live.title}
                  onChange={(e) => {
                    const next = [...content.lives]
                    next[idx] = { ...live, title: e.target.value }
                    setContent({ ...content, lives: next })
                  }}
                />
              </label>
              <label>
                โฮสต์
                <input
                  value={live.host}
                  onChange={(e) => {
                    const next = [...content.lives]
                    next[idx] = { ...live, host: e.target.value }
                    setContent({ ...content, lives: next })
                  }}
                />
              </label>
              <label>
                ผู้ชม
                <input
                  value={live.viewers}
                  onChange={(e) => {
                    const next = [...content.lives]
                    next[idx] = { ...live, viewers: e.target.value }
                    setContent({ ...content, lives: next })
                  }}
                />
              </label>
              <label>
                เปิด
                <select
                  value={live.active === false ? '0' : '1'}
                  onChange={(e) => {
                    const next = [...content.lives]
                    next[idx] = { ...live, active: e.target.value === '1' }
                    setContent({ ...content, lives: next })
                  }}
                >
                  <option value="1">เปิด</option>
                  <option value="0">ปิด</option>
                </select>
              </label>
            </div>
          ))}
          <button
            type="button"
            className="admin-btn ghost"
            onClick={() =>
              setContent({
                ...content,
                lives: [
                  ...content.lives,
                  {
                    id: `l${Date.now()}`,
                    title: 'ไลฟ์ใหม่',
                    host: 'Host',
                    viewers: '1 พัน',
                    active: true,
                    sort: content.lives.length + 1,
                  },
                ],
              })
            }
          >
            + เพิ่มไลฟ์
          </button>
          <button type="submit" className="admin-btn" style={{ marginLeft: 8 }}>
            บันทึก Live
          </button>
        </form>
      ) : null}

      {section === 'copy' ? (
        <form className="admin-card admin-form" onSubmit={saveContent}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>ข้อความทั่วไป</h2>
          <div className="admin-form-grid">
            <label>
              ปุ่มบนแบนเนอร์
              <input
                value={content.bannerCta}
                onChange={(e) => setContent({ ...content, bannerCta: e.target.value })}
              />
            </label>
            <label>
              placeholder ค้นหา
              <input
                value={content.search.placeholder}
                onChange={(e) =>
                  setContent({
                    ...content,
                    search: { ...content.search, placeholder: e.target.value },
                  })
                }
              />
            </label>
            <label>
              หัวข้อยอดนิยมในค้นหา
              <input
                value={content.search.popularTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    search: { ...content.search, popularTitle: e.target.value },
                  })
                }
              />
            </label>
            <label>
              ข้อความค่าส่งหน้ารายละเอียดสินค้า
              <input
                value={content.productShippingTemplate}
                onChange={(e) =>
                  setContent({ ...content, productShippingTemplate: e.target.value })
                }
              />
            </label>
          </div>
          <p style={{ color: '#6b7280', fontSize: 12 }}>
            ใช้ตัวแปร {'{location}'} และ {'{freeShippingMin}'} ในข้อความค่าส่งได้
          </p>
          <button type="submit" className="admin-btn">
            บันทึกข้อความ
          </button>
        </form>
      ) : null}

      {section === 'auth' ? (
        <form className="admin-card admin-form" onSubmit={saveContent}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>หน้าเข้าสู่ระบบ / สมัคร</h2>
          <label>
            คำใบ้บัญชีทดลอง
            <input
              value={content.auth.loginHint}
              onChange={(e) =>
                setContent({ ...content, auth: { ...content.auth, loginHint: e.target.value } })
              }
            />
          </label>
          <label>
            ข้อความสมัครผู้ซื้อ
            <input
              value={content.auth.buyerPitch}
              onChange={(e) =>
                setContent({ ...content, auth: { ...content.auth, buyerPitch: e.target.value } })
              }
            />
          </label>
          <label>
            ข้อความสมัครผู้ขาย
            <input
              value={content.auth.sellerPitch}
              onChange={(e) =>
                setContent({ ...content, auth: { ...content.auth, sellerPitch: e.target.value } })
              }
            />
          </label>
          <button type="submit" className="admin-btn">
            บันทึก
          </button>
        </form>
      ) : null}

      {section === 'help' ? (
        <form className="admin-card admin-form" onSubmit={saveContent}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>ศูนย์ความช่วยเหลือ</h2>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 0 }}>
            ข้อความหน้า /help และช่องทางด้านล่าง (LINE ID, โทร, อีเมล ฯลฯ) — กล่องข้อความลูกค้าดูที่เมนู
            “ศูนย์ช่วยเหลือ”
          </p>
          <div className="admin-form-grid">
            <label>
              หัวข้อหน้า
              <input
                value={content.help.title}
                onChange={(e) =>
                  setContent({ ...content, help: { ...content.help, title: e.target.value } })
                }
              />
            </label>
            <label>
              คำอธิบายสั้น
              <input
                value={content.help.subtitle}
                onChange={(e) =>
                  setContent({ ...content, help: { ...content.help, subtitle: e.target.value } })
                }
              />
            </label>
            <label>
              หัวข้อฟอร์ม
              <input
                value={content.help.formTitle}
                onChange={(e) =>
                  setContent({ ...content, help: { ...content.help, formTitle: e.target.value } })
                }
              />
            </label>
            <label>
              คำใบ้ฟอร์ม
              <input
                value={content.help.formHint}
                onChange={(e) =>
                  setContent({ ...content, help: { ...content.help, formHint: e.target.value } })
                }
              />
            </label>
            <label>
              หัวข้อช่องทางด้านล่าง
              <input
                value={content.help.channelsTitle}
                onChange={(e) =>
                  setContent({
                    ...content,
                    help: { ...content.help, channelsTitle: e.target.value },
                  })
                }
              />
            </label>
            <label>
              หัวข้อฟอร์ม (คั่นด้วยจุลภาค)
              <input
                value={content.help.topics.join(', ')}
                onChange={(e) =>
                  setContent({
                    ...content,
                    help: {
                      ...content.help,
                      topics: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </label>
          </div>

          <h3 style={{ fontSize: 14, marginBottom: 8 }}>ช่องทางติดต่อ (LINE / อื่นๆ)</h3>
          {content.help.channels.map((channel, index) => (
            <div
              key={channel.id}
              className="admin-form-grid"
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <label>
                ประเภท
                <select
                  value={channel.type}
                  onChange={(e) => {
                    const channels = [...content.help.channels]
                    channels[index] = {
                      ...channel,
                      type: e.target.value as typeof channel.type,
                    }
                    setContent({ ...content, help: { ...content.help, channels } })
                  }}
                >
                  <option value="line">LINE</option>
                  <option value="facebook">Facebook</option>
                  <option value="phone">โทรศัพท์</option>
                  <option value="email">อีเมล</option>
                  <option value="other">อื่นๆ</option>
                </select>
              </label>
              <label>
                ชื่อที่แสดง
                <input
                  value={channel.label}
                  onChange={(e) => {
                    const channels = [...content.help.channels]
                    channels[index] = { ...channel, label: e.target.value }
                    setContent({ ...content, help: { ...content.help, channels } })
                  }}
                />
              </label>
              <label>
                ค่า / ID (เช่น @greatapp)
                <input
                  value={channel.value}
                  onChange={(e) => {
                    const channels = [...content.help.channels]
                    channels[index] = { ...channel, value: e.target.value }
                    setContent({ ...content, help: { ...content.help, channels } })
                  }}
                />
              </label>
              <label>
                ลิงก์เปิด (ถ้ามี)
                <input
                  value={channel.link || ''}
                  onChange={(e) => {
                    const channels = [...content.help.channels]
                    channels[index] = { ...channel, link: e.target.value }
                    setContent({ ...content, help: { ...content.help, channels } })
                  }}
                  placeholder="https://line.me/..."
                />
              </label>
              <label>
                ลำดับ
                <input
                  type="number"
                  value={channel.sort ?? index + 1}
                  onChange={(e) => {
                    const channels = [...content.help.channels]
                    channels[index] = { ...channel, sort: Number(e.target.value) }
                    setContent({ ...content, help: { ...content.help, channels } })
                  }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={channel.active !== false}
                  onChange={(e) => {
                    const channels = [...content.help.channels]
                    channels[index] = { ...channel, active: e.target.checked }
                    setContent({ ...content, help: { ...content.help, channels } })
                  }}
                />
                แสดงในแอป
              </label>
              <button
                type="button"
                className="admin-btn ghost"
                onClick={() =>
                  setContent({
                    ...content,
                    help: {
                      ...content.help,
                      channels: content.help.channels.filter((c) => c.id !== channel.id),
                    },
                  })
                }
              >
                ลบช่องทาง
              </button>
            </div>
          ))}
          <button
            type="button"
            className="admin-btn ghost"
            onClick={() =>
              setContent({
                ...content,
                help: {
                  ...content.help,
                  channels: [
                    ...content.help.channels,
                    {
                      id: `c${Date.now()}`,
                      type: 'line',
                      label: 'LINE',
                      value: '@',
                      link: '',
                      active: true,
                      sort: content.help.channels.length + 1,
                    },
                  ],
                },
              })
            }
          >
            + เพิ่มช่องทาง
          </button>
          <button type="submit" className="admin-btn" style={{ marginLeft: 8 }}>
            บันทึกช่วยเหลือ
          </button>
        </form>
      ) : null}
    </div>
  )
}
