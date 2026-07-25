import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { feedApi } from '../api'
import type { ApiFeedPost, ApiProduct } from '../api/types'
import { ImageUpload } from '../components/ImageUpload'
import { formatPrice } from '../data/catalog'
import { useCatalog } from '../store/CatalogContext'
import { useStore } from '../store/StoreContext'
import { useToast } from '../store/ToastContext'
import './LivePage.css'

export function LivePage() {
  const { appContent, products } = useCatalog()
  const { user } = useStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ApiFeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [image, setImage] = useState('')
  const [caption, setCaption] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [productQ, setProductQ] = useState('')

  async function reload() {
    setLoading(true)
    try {
      const res = await feedApi.list()
      setPosts(res.posts)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'โหลดฟีดไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const pickList = useMemo(() => {
    const term = productQ.trim().toLowerCase()
    return products
      .filter((p) => p.status !== 'hidden' && p.status !== 'draft')
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .slice(0, 24)
  }, [products, productQ])

  function toggleProduct(id: string) {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 5) {
        toast('ปักตะกร้าได้สูงสุด 5 สินค้า')
        return prev
      }
      return [...prev, id]
    })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: '/live' } })
      return
    }
    if (!image || !caption.trim()) {
      toast('ใส่รูปและคำบรรยายก่อนโพสต์')
      return
    }
    setBusy(true)
    try {
      const res = await feedApi.create({
        image,
        caption: caption.trim(),
        productIds: picked,
      })
      toast(res.message || 'โพสต์แล้ว')
      setComposerOpen(false)
      setImage('')
      setCaption('')
      setPicked([])
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'โพสต์ไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  async function onLike(post: ApiFeedPost) {
    if (!user) {
      navigate('/login', { state: { from: '/live' } })
      return
    }
    try {
      const res = await feedApi.toggleLike(post.id)
      setPosts((prev) => prev.map((p) => (p.id === post.id ? res.post : p)))
    } catch (error) {
      toast(error instanceof Error ? error.message : 'กดถูกใจไม่สำเร็จ')
    }
  }

  return (
    <main className="page feed-page">
      <header className="feed-page__head">
        <div>
          <h1>{appContent.livePage?.title || 'ฟีด'}</h1>
          <p>{appContent.livePage?.subtitle || 'โพสต์รูป เขียนแคปชัน ปักตะกร้าสินค้า'}</p>
        </div>
        <button
          type="button"
          className="feed-page__compose-btn"
          onClick={() => {
            if (!user) {
              navigate('/login', { state: { from: '/live' } })
              return
            }
            setComposerOpen(true)
          }}
        >
          + โพสต์
        </button>
      </header>

      {loading ? (
        <p className="feed-page__empty">กำลังโหลดฟีด...</p>
      ) : posts.length === 0 ? (
        <p className="feed-page__empty">ยังไม่มีโพสต์ — เป็นคนแรกที่แชร์รูปสิ</p>
      ) : (
        <div className="feed-page__list">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} onLike={() => void onLike(post)} />
          ))}
        </div>
      )}

      {composerOpen ? (
        <div className="feed-modal" role="dialog" aria-modal="true">
          <form className="feed-modal__panel" onSubmit={onSubmit}>
            <header>
              <h2>สร้างโพสต์</h2>
              <button type="button" onClick={() => setComposerOpen(false)}>
                ปิด
              </button>
            </header>
            <label>
              รูปภาพ *
              <ImageUpload value={image} onChange={setImage} />
            </label>
            <label>
              คำบรรยาย *{' '}
              <span className="muted">
                {caption.length}/2000
              </span>
              <textarea
                value={caption}
                maxLength={2000}
                rows={4}
                placeholder="เล่าเรื่องสินค้า หรือโปรโมชันสั้นๆ..."
                onChange={(e) => setCaption(e.target.value)}
                required
              />
            </label>
            <div className="feed-modal__pin">
              <div className="feed-modal__pin-head">
                <strong>ปักตะกร้าสินค้า</strong>
                <span>เลือกได้ {picked.length}/5</span>
              </div>
              <input
                value={productQ}
                onChange={(e) => setProductQ(e.target.value)}
                placeholder="ค้นหาสินค้าที่จะปัก..."
              />
              <div className="feed-modal__products">
                {pickList.map((p) => {
                  const on = picked.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={on ? 'is-on' : undefined}
                      onClick={() => toggleProduct(p.id)}
                    >
                      <img src={p.image} alt="" />
                      <span>{p.name}</span>
                      <em>{formatPrice(p.price)}</em>
                    </button>
                  )
                })}
              </div>
            </div>
            <footer>
              <button type="button" className="ghost" onClick={() => setComposerOpen(false)}>
                ยกเลิก
              </button>
              <button type="submit" disabled={busy}>
                {busy ? 'กำลังโพสต์...' : 'โพสต์'}
              </button>
            </footer>
          </form>
        </div>
      ) : null}
    </main>
  )
}

function FeedCard({ post, onLike }: { post: ApiFeedPost; onLike: () => void }) {
  const pins = (post.products || []) as ApiProduct[]
  return (
    <article className="feed-card">
      <header className="feed-card__head">
        <div className="feed-card__avatar" aria-hidden>
          {(post.userName || '?').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{post.userName}</strong>
          <time dateTime={post.createdAt}>
            {new Date(post.createdAt).toLocaleString('th-TH', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </time>
        </div>
      </header>
      <div className="feed-card__media">
        <img
          src={post.image}
          alt=""
          onError={(e) => {
            const el = e.currentTarget
            if (el.dataset.fallback === '1') return
            el.dataset.fallback = '1'
            el.src =
              'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=800&fit=crop'
          }}
        />
      </div>
      <div className="feed-card__actions">
        <button type="button" className={post.liked ? 'is-liked' : undefined} onClick={onLike}>
          {post.liked ? '♥' : '♡'} {post.likeCount || 0}
        </button>
        {pins.length > 0 ? <span>🛒 {pins.length} สินค้า</span> : null}
      </div>
      <p className="feed-card__caption">
        <strong>{post.userName}</strong> {post.caption}
      </p>
      {pins.length > 0 ? (
        <div className="feed-card__pins">
          {pins.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className="feed-card__pin">
              <img src={p.image} alt="" />
              <span>
                <em>{p.name}</em>
                <small>{formatPrice(p.price)}</small>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  )
}
