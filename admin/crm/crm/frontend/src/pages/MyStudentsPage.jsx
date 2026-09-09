import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function MyStudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sessions, setSessions] = useState({})

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get('/academy/additional-teachers/my-students/')
      const data = res.data?.results || res.data || []
      setStudents(Array.isArray(data) ? data : [])
      setError('')
      await fetchSessions(data)
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSessions = async (list) => {
    const statusMap = {}
    for (const s of list) {
      try {
        const res = await api.get(`/academy/additional-teachers/${s.id}/session-status/`)
        statusMap[s.id] = res.data
      } catch (err) {}
    }
    setSessions(statusMap)
  }

  useEffect(() => {
    fetchStudents()
    const interval = setInterval(fetchStudents, 30000)
    return () => clearInterval(interval)
  }, [fetchStudents])

  const openChat = async (student) => {
    try {
      const res = await api.post('/chat/conversations/start-parent-chat/', { student_id: student.id })
      if (res.data?.id) {
        navigate('/chat')
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Chat ochishda xatolik.')
      setTimeout(() => setMessage(''), 4000)
    }
  }

  const startLesson = async (regId) => {
    setMessage('')
    try {
      await api.post(`/academy/additional-teachers/${regId}/start-session/`)
      await fetchStudents()
    } catch (err) {
      setMessage(err.response?.data?.detail || err.response?.data?.error || 'Darsni boshlashda xatolik.')
      setTimeout(() => setMessage(''), 4000)
    }
  }

  const endLesson = async (regId) => {
    setMessage('')
    try {
      await api.post(`/academy/additional-teachers/${regId}/end-session/`)
      await fetchStudents()
    } catch (err) {
      setMessage(err.response?.data?.detail || err.response?.data?.error || 'Darsni tugatishda xatolik.')
      setTimeout(() => setMessage(''), 4000)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>O'quvchilar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">👨‍🏫 O'quvchilarim</h1>
        <p className="page-subtitle">Sizga yozilgan barcha o'quvchilar — ularga dars belgilaysiz</p>
      </div>

      {error && <div className="auth-error">⚠️ {error}</div>}
      {message && <div className="auth-error">⚠️ {message}</div>}

      {students.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>Hozircha o'quvchilar yozilmagan</h3>
          <p>O'quvchilar sizga yozilishi bilanoq ular shu yerda ko'rinadi</p>
        </div>
      ) : (
        <div className="cards-grid">
          {students.map(s => {
            const status = sessions[s.id]?.status || 'not_started'
            return (
              <div key={s.id} className={`edu-card student-card ${s.student.is_online ? 'student-card-online' : ''}`}>
                <div className="session-controls">
                  {status === 'not_started' && (
                    <button className="btn btn-sm btn-success" onClick={() => startLesson(s.id)}>▶️ Darsni boshlash</button>
                  )}
                  {status === 'started' && (
                    <button className="btn btn-sm btn-danger" onClick={() => endLesson(s.id)}>⏹️ Tugatish</button>
                  )}
                  {status === 'done' && (
                    <span className="badge badge-success">✅ Dars tugadi</span>
                  )}
                </div>
                <div className="student-card-main">
                  <div className="student-avatar-wrap">
                    <div className="user-cell-avatar">{s.student.first_name?.[0] || '?'}</div>
                    <span className={`online-dot ${s.student.is_online ? 'online' : 'offline'}`}></span>
                  </div>
                  <div className="student-card-info">
                    <span className="student-card-name">{s.student.first_name} {s.student.last_name}</span>
                    <span className="student-card-meta">
                      {s.student.is_online ? <span className="online-label">🟢 Onlayn</span> : <span className="offline-label">⚫ Nofaol</span>}
                      {s.weekday_display && <span className="badge badge-secondary">📅 {s.weekday_display}</span>}
                      {s.time && <span className="badge badge-primary">🕐 {s.time}</span>}
                      {s.subject_display && <span className="badge badge-accent">📖 {s.subject_display}</span>}
                    </span>
                    {s.student.phone && <span className="student-card-phone">📞 {s.student.phone}</span>}
                  </div>
                </div>

                {s.groups.length > 0 && (
                  <div className="student-lessons">
                    <span className="lesson-label">Guruhlar:</span>
                    <div className="lesson-list">
                      {s.groups.map(g => (
                        <span key={g.id} className="badge badge-secondary">{g.name}{g.room ? ` · ${g.room}` : ''}</span>
                      ))}
                    </div>
                  </div>
                )}

                {s.lessons.length > 0 ? (
                  <div className="student-lessons">
                    <span className="lesson-label">Bugungi darslar:</span>
                    <div className="lesson-list">
                      {s.lessons.map(l => (
                        <span key={l.id} className="badge badge-success">📚 {l.topic} · {l.group_name}{l.room ? ` · ${l.room}` : ''}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="student-lessons">
                    <span className="lesson-label">Bugungi darslar:</span>
                    <span className="badge badge-warning">Dars jadvalga kiritilmagan</span>
                  </div>
                )}

                <div className="btn-group mt-1">
                  <button className="btn btn-sm btn-primary" onClick={() => openChat(s.student)}>
                    👨‍👧 Ota-ona bilan suhbat
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
