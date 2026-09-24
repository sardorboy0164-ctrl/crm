import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import SwiperCarousel from '../components/SwiperCarousel'

export default function HomeworkPage() {
  const { user } = useAuth()
  const [homeworks, setHomeworks] = useState([])
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [submitData, setSubmitData] = useState({ homework: '', answer_text: '', file: null })
  const [showSubmit, setShowSubmit] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchHomeworks()
    fetchGroups()
  }, [])

  const fetchHomeworks = async () => {
    try {
      const res = await api.get('/academy/homeworks/')
      setHomeworks(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchGroups = async () => {
    try {
      const res = await api.get('/academy/groups/')
      setGroups(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      setMessage("⚠️ Sarlavha kiriting")
      return
    }
    setSaving(true)
    setMessage('')
    try {
      // Faqat sarlavha + matn — boshqa hech nima talab qilinmaydi
      await api.post('/academy/homeworks/', {
        title: formData.title,
        description: formData.description,
      })
      setMessage('✅ Uy vazifasi yaratildi!')
      setShowCreate(false)
      setFormData({ title: '', description: '' })
      fetchHomeworks()
    } catch (err) {
      setMessage(err.response?.data?.detail || JSON.stringify(err.response?.data) || "⚠️ Yaratishda xatolik")
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (homeworkId) => {
    setSaving(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('homework', homeworkId)
      fd.append('answer_text', submitData.answer_text)
      if (submitData.file) fd.append('file', submitData.file)
      await api.post('/academy/submissions/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage('✅ Topshiriq yuborildi!')
      setShowSubmit(null)
      setSubmitData({ homework: '', answer_text: '', file: null })
      fetchHomeworks()
    } catch (err) {
      setMessage("⚠️ Yuborishda xatolik")
    } finally {
      setSaving(false)
    }
  }

  const canCreate = ['admin', 'kurator', 'ustoz', 'qowimcha_ustoz'].includes(user?.role)
  const isStudent = user?.role === 'oquvchi'
  // Guruh bo'yicha filtr: guruhsiz (umumiy) vazifalar har doim ko'rinadi
  const filteredHomeworks = selectedGroup
    ? homeworks.filter(h => !h.group || h.group?.toString() === selectedGroup || h.group === parseInt(selectedGroup))
    : homeworks

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">📋 Uy vazifalari</h1>
        <p className="page-subtitle">Topshiriqlar boshqaruvi</p>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✖ Bekor' : '➕ Yangi topshiriq'}
          </button>
        )}
      </div>

      <div className="form-group" style={{ maxWidth: '300px' }}>
        <select className="edu-input" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
          <option value="">— Barcha guruhlar —</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {message && <div className={message.startsWith('✅') ? 'auth-success' : 'auth-error'}>{message}</div>}

      {showCreate && canCreate && (
        <div className="edu-card">
          <h3 className="edu-card-title">➕ Yangi topshiriq</h3>
          <div className="form-group">
            <label>Sarlavha</label>
            <input type="text" className="edu-input" value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Masalan: 1-dars tayanch so'zlari" />
          </div>
          <div className="form-group">
            <label>Matn</label>
            <textarea className="edu-input" rows="4" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Uy vazifasi matni..."></textarea>
          </div>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Yaratilmoqda...' : '💾 Saqlash'}
          </button>
        </div>
      )}

      <SwiperCarousel
        items={filteredHomeworks}
        slidesPerView={3}
        spaceBetween={16}
        autoScroll={true}
        speed={1.2}
        title="📋 Uy vazifalari ro'yxati"
        subtitle={`${filteredHomeworks.length} ta topshiriq mavjud`}
        emptyMessage="Topshiriqlar topilmadi"
        emptyIcon="📋"
        renderItem={(hw) => (
          <div className="edu-card homework-card">
            <div className="homework-header">
              <h3>{hw.title}</h3>
              {hw.due_date && (
                <span className={`badge ${new Date(hw.due_date) < new Date() ? 'badge-danger' : 'badge-warning'}`}>
                  📅 {new Date(hw.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="homework-desc">{hw.description}</p>
            <p className="text-muted">📋 {hw.group_name || hw.group?.name || 'Barcha guruhlar'}</p>
            {isStudent && (
              <>
                {hw.submitted ? (
                  <div className="homework-submitted">
                    <span className="badge badge-success">✅ Topshirildi</span>
                    {hw.answer_text && (
                      <p className="text-muted mt-1">📝 <em>{hw.answer_text}</em></p>
                    )}
                    {hw.feedback && <p className="text-muted mt-1">💬 {hw.feedback}</p>}
                    {hw.grade != null && <span className="badge badge-primary">📝 Baho: {hw.grade}</span>}
                  </div>
                ) : (
                  <button className="btn btn-primary btn-full" onClick={() => setShowSubmit(hw.id)}>
                    📤 Topshirish
                  </button>
                )}
              </>
            )}
            {canCreate && hw.submissions_count !== undefined && (
              <p className="text-muted">📤 {hw.submissions_count} ta topshirildi</p>
            )}

            {showSubmit === hw.id && (
              <div className="homework-submit-form">
                <div className="form-group">
                  <label>Javob matni</label>
                  <textarea className="edu-input" rows="3" value={submitData.answer_text} onChange={e => setSubmitData(p => ({ ...p, answer_text: e.target.value }))}></textarea>
                </div>
                <div className="form-group">
                  <label>Fayl</label>
                  <input type="file" className="edu-input" onChange={e => setSubmitData(p => ({ ...p, file: e.target.files[0] }))} />
                </div>
                <div className="action-btns">
                  <button className="btn btn-primary" onClick={() => handleSubmit(hw.id)} disabled={saving}>
                    {saving ? 'Yuborilmoqda...' : '📤 Yuborish'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowSubmit(null)}>Bekor</button>
                </div>
              </div>
            )}
          </div>
        )}
      />
    </div>
  )
}
