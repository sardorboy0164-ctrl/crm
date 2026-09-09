import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const roleLabels = {
  ustoz: 'Ustoz',
  qowimcha_ustoz: "Qo'shimcha Ustoz",
  kurator: 'Kurator',
  ota_ona: 'Ota-ona',
  oquvchi: "O'quvchi",
  admin: 'Admin',
}

export default function ChatPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [students, setStudents] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const canStart = ['ustoz', 'kurator', 'admin'].includes(user?.role)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get('/chat/conversations/')
      const list = res.data?.results || res.data || []
      setConversations(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (convId) => {
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages/`)
      const list = res.data?.results || res.data || []
      setMessages(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(() => {
      fetchConversations()
      if (activeConv) fetchMessages(activeConv.id)
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchConversations, fetchMessages, activeConv])

  useEffect(() => {
    if (activeConv) fetchMessages(activeConv.id)
  }, [activeConv, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openConversation = (conv) => {
    setActiveConv(conv)
    setText('')
  }

  const openStudentModal = async () => {
    setError('')
    setShowStudentModal(true)
    try {
      const res = await api.get('/accounts/users/students/')
      const data = res.data?.results || res.data || []
      setStudents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  const startChatWithParent = async (studentId) => {
    setBusy(true)
    setError('')
    try {
      const res = await api.post('/chat/conversations/start-parent-chat/', { student_id: studentId })
      const conv = res.data
      await fetchConversations()
      setActiveConv(conv)
      setShowStudentModal(false)
      await fetchMessages(conv.id)
    } catch (err) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi.')
    } finally {
      setBusy(false)
    }
  }

  const handleSend = async () => {
    if (!text.trim() || !activeConv) return
    const value = text
    setText('')
    try {
      await api.post(`/chat/conversations/${activeConv.id}/send/`, { text: value })
      await fetchMessages(activeConv.id)
      fetchConversations()
    } catch (err) {
      setError('Xabar yuborishda xatolik: ' + (err.response?.data?.error || err.message))
    }
  }

  const participantLabel = (p) => {
    const name = `${p.first_name} ${p.last_name}`.trim() || p.username
    return `${name} (${roleLabels[p.role] || p.role})`
  }

  const convTitle = (conv) => {
    const others = conv.participants.filter(p => p.id !== user?.id)
    return others.map(p => `${p.first_name} ${p.last_name}`.trim() || p.username).join(', ') || 'Suhbat'
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Suhbatlar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">💬 Chat</h1>
        <p className="page-subtitle">Ustoz — Ota-ona — Kurator aloqasi</p>
        {canStart && (
          <button className="btn btn-primary" onClick={openStudentModal}>
            👨‍👧 O'quvchi ota-onasi bilan bog'lanish
          </button>
        )}
      </div>

      {error && <div className="auth-error">⚠️ {error}</div>}

      <div className="chat-layout">
        <div className="chat-sidebar">
          <h3 className="section-title">Suhbatlar</h3>
          {conversations.length === 0 ? (
            <div className="chat-empty">
              <div className="empty-icon">💬</div>
              <p>Suhbatlar yo'q</p>
              {canStart && <button className="btn btn-secondary btn-sm" onClick={openStudentModal}>+ Yangi suhbat</button>}
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`chat-conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                onClick={() => openConversation(conv)}
              >
                <div className="chat-conv-avatar">
                  {convTitle(conv)[0] || '?'}
                </div>
                <div className="chat-conv-body">
                  <span className="chat-conv-title">{convTitle(conv)}</span>
                  <span className="chat-conv-last">
                    {conv.last_message ? `${conv.last_message.sender_name}: ${conv.last_message.text}` : 'Xabarsiz'}
                  </span>
                </div>
                {conv.unread_count > 0 && <span className="chat-unread-badge">{conv.unread_count}</span>}
              </div>
            ))
          )}
        </div>

        <div className="chat-main">
          {!activeConv ? (
            <div className="chat-placeholder">
              <div className="empty-icon">💬</div>
              <h3>Suhbatni tanlang</h3>
              <p className="text-muted">O'quvchi ota-onasi va kuratori bilan birga suhbatlashing</p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <div className="chat-header-title">
                  <div className="chat-conv-avatar">{convTitle(activeConv)[0] || '?'}</div>
                  <div>
                    <h3>{convTitle(activeConv)}</h3>
                    <span className="chat-participants">
                      {activeConv.participants.map(p => participantLabel(p)).join(' • ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-placeholder"><p className="text-muted">Hali xabarlar yo'q</p></div>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`chat-message ${m.sender === user?.id ? 'own' : 'theirs'}`}>
                      <div className="chat-message-meta">
                        <span className="chat-message-sender">{m.sender_name}</span>
                        <span className="chat-message-time">{new Date(m.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="chat-message-bubble">{m.text}</div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef}></div>
              </div>
              <div className="chat-input-row">
                <input
                  type="text"
                  className="edu-input"
                  placeholder="Xabar yozing..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                />
                <button className="btn btn-primary" onClick={handleSend} disabled={!text.trim()}>📤</button>
              </div>
            </>
          )}
        </div>
      </div>

      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>O'quvchini tanlang</h2>
              <button className="modal-close" onClick={() => setShowStudentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {busy ? <p>Yuklanmoqda...</p> : (
                <>
                  {error && <div className="auth-error">⚠️ {error}</div>}
                  {students.length === 0 ? (
                    <p className="text-muted">O'quvchilar topilmadi</p>
                  ) : (
                    <div className="chat-student-list">
                      {students.map(s => (
                        <button key={s.id} className="chat-student-item" onClick={() => startChatWithParent(s.id)}>
                          <div className="user-cell-avatar">{s.first_name?.[0] || s.username?.[0] || '?'}</div>
                          <div className="chat-student-info">
                            <span className="chat-student-name">{s.first_name} {s.last_name}</span>
                            {s.is_online ? (
                              <span className="online-label">🟢 Onlayn</span>
                            ) : (
                              <span className="offline-label">⚫ Nofaol</span>
                            )}
                          </div>
                          <span className="btn btn-sm btn-primary">Chat</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}