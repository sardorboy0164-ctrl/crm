import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function ParentDashboard() {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [childData, setChildData] = useState(null)
  const [statusData, setStatusData] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingChild, setLoadingChild] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchChildren()
  }, [])

  const fetchChildren = async () => {
    try {
      const res = await api.get('/accounts/parent-students/')
      const data = (res.data?.results || res.data || []).map(ps => ({
        id: ps.student,
        first_name: ps.student_name?.split(' ')[0] || '',
        last_name: ps.student_name?.split(' ').slice(1).join(' ') || '',
        name: ps.student_name,
        student_id: ps.student,
      }))
      setChildren(data)
      if (data.length > 0) {
        selectChild(data[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const selectChild = async (child) => {
    setSelectedChild(child)
    setLoadingChild(true)
    try {
      const [attRes, quizRes, hwRes, statusRes, photosRes] = await Promise.all([
        api.get(`/academy/attendances/?student=${child.student_id}`).catch(() => ({ data: { results: [] } })),
        api.get(`/quiz/results/?student=${child.student_id}`).catch(() => ({ data: { results: [] } })),
        api.get(`/academy/homeworks/?student=${child.student_id}`).catch(() => ({ data: { results: [] } })),
        api.get(`/kurator/statuses/?student=${child.student_id}`).catch(() => ({ data: { results: [] } })),
        api.get('/kurator/photos/').catch(() => ({ data: { results: [] } })),
      ])
      setChildData({
        attendance: attRes.data?.results || attRes.data || [],
        quizResults: quizRes.data?.results || quizRes.data || [],
        homework: hwRes.data?.results || hwRes.data || [],
      })
      setStatusData(statusRes.data?.results || statusRes.data || [])
      setPhotos(photosRes.data?.results || photosRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingChild(false)
    }
  }

  const startKuratorChat = async (studentId) => {
    setChatBusy(true)
    setChatMsg('')
    try {
      await api.post('/chat/conversations/start-kurator-chat/', { student_id: studentId })
      setChatMsg('✅ Suhbat ochildi! Suhbatlar bo\'limiga o\'tildi.')
      navigate('/chat')
    } catch (err) {
      setChatMsg('⚠️ ' + (err.response?.data?.error || 'Suhbat ochishda xatolik'))
    } finally {
      setChatBusy(false)
    }
  }

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
        <h1 className="page-title glow-text">👨‍👩‍👧 Bolalarim paneli</h1>
        <p className="page-subtitle">Farzandlaringizning ta'limi haqida ma'lumot</p>
        {selectedChild && (
          <button
            className="btn btn-primary"
            onClick={() => startKuratorChat(selectedChild.student_id)}
            disabled={chatBusy}
          >
            💬 Kurator bilan suhbat
          </button>
        )}
      </div>

      {chatMsg && <div className={chatMsg.startsWith('✅') ? 'auth-success' : 'auth-error'}>{chatMsg}</div>}

      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👨‍👩‍👧</div>
          <h3>Bolalar topilmadi</h3>
          <p>Bog'langan bolalar mavjud emas</p>
        </div>
      ) : (
        <>
          <div className="children-selector">
            {children.map(child => (
              <button
                key={child.id}
                className={`child-tab ${selectedChild?.id === child.id ? 'active' : ''}`}
                onClick={() => selectChild(child)}
              >
                <span className="child-avatar">{child.first_name?.[0] || '?'}</span>
                <span>{child.first_name} {child.last_name}</span>
              </button>
            ))}
          </div>

          {loadingChild ? (
            <div className="page-loading"><div className="loading-spinner"></div><p>Ma'lumotlar yuklanmoqda...</p></div>
          ) : childData && (
            <>
              <div className="stats-grid">
                <div className="stat-card stat-card-primary">
                  <div className="stat-icon">✅</div>
                  <div className="stat-info">
                    <span className="stat-number">
                      {childData.attendance.length > 0
                        ? Math.round((childData.attendance.filter(a => a.is_present).length / childData.attendance.length) * 100)
                        : 0}%
                    </span>
                    <span className="stat-label">Davomat</span>
                  </div>
                </div>
                <div className="stat-card stat-card-accent">
                  <div className="stat-icon">📝</div>
                  <div className="stat-info">
                    <span className="stat-number">{childData.quizResults.length}</span>
                    <span className="stat-label">Testlar</span>
                  </div>
                </div>
                <div className="stat-card stat-card-success">
                  <div className="stat-icon">📋</div>
                  <div className="stat-info">
                    <span className="stat-number">{childData.homework.length}</span>
                    <span className="stat-label">Uy vazifalari</span>
                  </div>
                </div>
              </div>

              {statusData.length > 0 && (
                <div className="section">
                  <h2 className="section-title">📊 O\'quv holati</h2>
                  <div className="cards-grid">
                    {statusData.map((st, idx) => (
                      <div key={st.id || idx} className="edu-card">
                        <h4>{st.status === 'ijobiy' ? '✅ Ijobiy' : '❌ Salbiy'}</h4>
                        {st.comment && <p className="text-muted">{st.comment}</p>}
                        <span className="text-muted">
                          {st.kurator_name ? `Kurator: ${st.kurator_name}` : ''}{st.updated_at ? ` • ${new Date(st.updated_at).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {photos.length > 0 && (
                <div className="section">
                  <h2 className="section-title">📷 Dars suratlari</h2>
                  <div className="cards-grid">
                    {photos.map(photo => (
                      <div key={photo.id} className="edu-card photo-card">
                        <div className="photo-image">
                          <img src={photo.photo || photo.image || ''} alt={photo.lesson_topic || photo.topic || 'Surat'} />
                        </div>
                        <div className="photo-info">
                          <h4>{photo.lesson_topic || photo.topic || 'Surat'}</h4>
                          {photo.description && <p>{photo.description}</p>}
                          <span className="text-muted">{photo.group_name || ''} {photo.date ? ` • ${new Date(photo.date).toLocaleDateString()}` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {childData.quizResults.length > 0 && (
                <div className="section">
                  <h2 className="section-title">📝 Test natijalari</h2>
                  <div className="table-container">
                    <table className="edu-table">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Baho</th>
                          <th>Sana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childData.quizResults.map((r, idx) => {
                          const pct = r.percentage ?? r.score ?? 0
                          return (
                            <tr key={r.id || idx}>
                              <td>{r.quiz_title || r.quiz?.title || 'Test'}</td>
                              <td><span className="badge badge-success">{pct}%</span></td>
                              <td>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—')}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {childData.homework.length > 0 && (
                <div className="section">
                  <h2 className="section-title">📋 Uy vazifalari</h2>
                  <div className="cards-grid">
                    {childData.homework.map((hw, idx) => (
                      <div key={hw.id || idx} className="edu-card">
                        <h4>{hw.title || 'Uy vazifasi'}</h4>
                        <p className="text-muted">{hw.description || ''}</p>
                        {hw.due_date && (
                          <p className="text-muted">📅 Muddat: {new Date(hw.due_date).toLocaleDateString()}</p>
                        )}
                        <span className={`badge ${hw.submitted ? 'badge-success' : 'badge-warning'}`}>
                          {hw.submitted ? '✅ Topshirildi' : '⏳ Kutilmoqda'}
                        </span>
                        {hw.submitted && hw.grade != null && (
                          <span className="badge badge-primary ml-1">📝 Baho: {hw.grade}</span>
                        )}
                        {hw.submitted && hw.feedback && (
                          <p className="text-muted mt-1">💬 {hw.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {childData.attendance.length > 0 && (
                <div className="section">
                  <h2 className="section-title">✅ Davomat</h2>
                  <div className="attendance-chart">
                    <div className="chart-bar">
                      <div
                        className="chart-fill"
                        style={{ width: `${Math.round((childData.attendance.filter(a => a.is_present).length / childData.attendance.length) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="chart-label">
                      {childData.attendance.filter(a => a.is_present).length}/{childData.attendance.length} kun
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
