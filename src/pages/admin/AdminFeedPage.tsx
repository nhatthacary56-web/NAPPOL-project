import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { feedApi } from '../../api'
import type { ApiFeedPost } from '../../api/types'
import { formatPrice } from '../../data/catalog'
import { useToast } from '../../store/ToastContext'
import './AdminShell.css'

type Tab = 'all' | 'pending' | 'active' | 'hidden'

export function AdminFeedPage() {
  const { toast } = useToast()
  const [posts, setPosts] = useState<ApiFeedPost[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [busyId, setBusyId] = useState<string | null>(null)

  async function reload() {
    try {
      const res = await feedApi.adminList(tab === 'all' ? undefined : tab)
      setPosts(res.posts)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'โหลดฟีดไม่สำเร็จ')
    }
  }

  useEffect(() => {
    void reload()
  }, [tab])

  async function setStatus(id: string, status: 'active' | 'hidden' | 'pending') {
    setBusyId(id)
    try {
      await feedApi.update(id, { status })
      toast(
        status === 'active' ? 'อนุมัติแล้ว' : status === 'hidden' ? 'ซ่อนแล้ว' : 'ตั้งเป็นรอตรวจ',
      )
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'อัปเดตไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: string) {
    if (!confirm('ลบโพสต์นี้ถาวร?')) return
    setBusyId(id)
    try {
      await feedApi.remove(id)
      toast('ลบแล้ว')
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'ลบไม่สำเร็จ')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <h1>ฟีด / โพสต์รูป</h1>
      <p className="admin-page__sub">
        คุมโพสต์จากผู้ใช้ — อนุมัติ / ซ่อน / ลบ · ผู้ใช้โพสต์ใหม่จะเข้าคิว “รอตรวจ”
        (แอดมินโพสต์เองจะขึ้นฟีดทันที)
      </p>

      <div className="admin-content-tabs" style={{ marginBottom: 16 }}>
        {(
          [
            ['pending', 'รอตรวจ'],
            ['active', 'เผยแพร่'],
            ['hidden', 'ซ่อน'],
            ['all', 'ทั้งหมด'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? 'is-active' : undefined}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="admin-card">
        {posts.length === 0 ? (
          <p style={{ color: '#6b7280' }}>ไม่มีโพสต์ในแท็บนี้</p>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {posts.map((post) => (
              <article
                key={post.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '96px 1fr',
                  gap: 12,
                  borderBottom: '1px solid #eceff3',
                  paddingBottom: 12,
                }}
              >
                <img
                  src={post.image}
                  alt=""
                  style={{
                    width: 96,
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 10,
                    background: '#f3f4f6',
                  }}
                />
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong>{post.userName}</strong>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {post.status === 'pending'
                        ? 'รอตรวจ'
                        : post.status === 'active'
                          ? 'เผยแพร่'
                          : 'ซ่อน'}{' '}
                      · ♥ {post.likeCount || 0}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {post.caption}
                  </p>
                  {(post.products || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {(post.products || []).map((p) => (
                        <Link
                          key={p.id}
                          to={`/product/${p.id}`}
                          style={{ fontSize: 12, color: '#ee4d2d' }}
                        >
                          🛒 {p.name} ({formatPrice(p.price)})
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af' }}>
                    {new Date(post.createdAt).toLocaleString('th-TH')} · {post.id}
                  </p>
                  <div className="admin-actions">
                    {post.status !== 'active' ? (
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => void setStatus(post.id, 'active')}
                      >
                        อนุมัติ
                      </button>
                    ) : null}
                    {post.status !== 'hidden' ? (
                      <button
                        type="button"
                        disabled={busyId === post.id}
                        onClick={() => void setStatus(post.id, 'hidden')}
                      >
                        ซ่อน
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      disabled={busyId === post.id}
                      onClick={() => void remove(post.id)}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
