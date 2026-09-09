import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function PostsPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newPost, setNewPost] = useState({ title: '', content: '', target_audience: 'all' })
  const [saving, setSaving] = useState(false)
  const [commentText, setCommentText] = useState({})

  const canCreate = ['admin', 'ustoz', 'kurator'].includes(user?.role)

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const res = await api.get('/post/posts/')
      setPosts(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      await api.post('/post/posts/', newPost)
      setShowCreate(false)
      setNewPost({ title: '', content: '', target_audience: 'all' })
      fetchPosts()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleLike = async (postId) => {
    try {
      await api.post(`/post/posts/${postId}/like/`)
      fetchPosts()
    } catch (err) {
      console.error(err)
    }
  }

  const handleComment = async (postId) => {
    const text = commentText[postId]
    if (!text) return
    try {
      await api.post(`/post/posts/${postId}/add_comment/`, { content: text })
      setCommentText(prev => ({ ...prev, [postId]: '' }))
      fetchPosts()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Postlar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">📰 Postlar</h1>
        <p className="page-subtitle">Yangiliklar va e'lonlar</p>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✖ Bekor' : '➕ Yangi post'}
          </button>
        )}
      </div>

      {showCreate && (
        <div className="edu-card">
          <h3 className="edu-card-title">➕ Yangi post</h3>
          <div className="form-group">
            <label>Sarlavha</label>
            <input type="text" className="edu-input" value={newPost.title} onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))} placeholder="Post sarlavhasi" />
          </div>
          <div className="form-group">
            <label>Matn</label>
            <textarea className="edu-input" rows="4" value={newPost.content} onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))} placeholder="Post matni..."></textarea>
          </div>
          <div className="form-group">
            <label>Maqsadli auditoriya</label>
            <select className="edu-input" value={newPost.target_audience} onChange={e => setNewPost(p => ({ ...p, target_audience: e.target.value }))}>
              <option value="all">Barchasi</option>
              <option value="oquvchi">O'quvchilar</option>
              <option value="ustoz">Ustozlar</option>
              <option value="ota_ona">Ota-onalar</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Yuborilmoqda...' : '📤 Postni joylash'}
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <h3>Hozircha postlar yo'q</h3>
        </div>
      ) : (
        <div className="posts-feed">
          {posts.map(post => (
            <div key={post.id} className="edu-card post-card">
              <div className="post-header">
                <div className="post-author">
                  <div className="user-cell-avatar">{post.author_name?.[0] || 'U'}</div>
                  <div>
                    <span className="post-author-name">{post.author_name || post.author?.first_name || 'Anonim'}</span>
                    <span className="post-date">{post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
                {post.target_audience && post.target_audience !== 'all' && (
                  <span className="badge badge-primary">{post.target_audience_display || post.target_audience}</span>
                )}
              </div>
              <div className="post-body">
                {post.title && <h3 className="post-title">{post.title}</h3>}
                <p className="post-content">{post.content}</p>
              </div>
              <div className="post-actions">
                <button className={`post-action-btn ${post.is_liked ? 'liked' : ''}`} onClick={() => handleLike(post.id)}>
                  {post.is_liked ? '❤️' : '🤍'} {post.likes_count || 0}
                </button>
                <span className="post-action-btn">
                  💬 {post.comments_count || 0}
                </span>
              </div>
              {(post.last_comments || post.comments || []).length > 0 && (
                <div className="post-comments">
                  {(post.last_comments || post.comments || []).slice(-3).map((c, idx) => (
                    <div key={c.id || idx} className="post-comment">
                      <strong>{c.author_name || c.author?.first_name || 'User'}:</strong> {c.content || c.text}
                    </div>
                  ))}
                </div>
              )}
              <div className="post-comment-form">
                <input
                  type="text"
                  className="edu-input"
                  placeholder="Izoh yozing..."
                  value={commentText[post.id] || ''}
                  onChange={e => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                />
                <button className="btn btn-sm btn-primary" onClick={() => handleComment(post.id)}>📤</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
