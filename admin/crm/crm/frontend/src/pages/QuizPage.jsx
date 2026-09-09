import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const subjectColors = {
  matematika: { bg: 'rgba(108,92,231,0.12)', accent: '#6c5ce7', emoji: '🔢' },
  ingliz_tili: { bg: 'rgba(0,184,148,0.12)', accent: '#00b894', emoji: '🇬🇧' },
  rus_tili: { bg: 'rgba(116,185,255,0.12)', accent: '#74b9ff', emoji: '🇷🇺' },
  ozbek_tili: { bg: 'rgba(253,121,168,0.12)', accent: '#fd79a8', emoji: '🇺🇿' },
  fizika: { bg: 'rgba(253,203,110,0.12)', accent: '#fdcb6e', emoji: '⚡' },
  kimyo: { bg: 'rgba(85,239,196,0.12)', accent: '#55efc4', emoji: '🧪' },
  biologiya: { bg: 'rgba(162,155,254,0.12)', accent: '#a29bfe', emoji: '🧬' },
  tarix: { bg: 'rgba(225,112,85,0.12)', accent: '#e17055', emoji: '📜' },
}

function getSubjectStyle(subject) {
  return subjectColors[subject] || { bg: 'rgba(108,92,231,0.12)', accent: '#6c5ce7', emoji: '📝' }
}

export default function QuizPage() {
  const { user } = useAuth()
  const [quizzes, setQuizzes] = useState([])
  const [myResults, setMyResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('quizzes')
  const [showCreate, setShowCreate] = useState(false)
  const [newQuiz, setNewQuiz] = useState({
    title: '', subject: 'matematika', time_limit_minutes: 30, passing_score: 60,
    questions: [{ text: '', choices: ['', '', '', ''], correct: 0 }]
  })
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  const handleCardClick = (id) => {
    setSelectedId(prev => (prev === id ? null : id))
  }

  useEffect(() => {
    fetchQuizzes()
    if (user?.role === 'oquvchi') fetchMyResults()
  }, [])

  const fetchQuizzes = async () => {
    try {
      const res = await api.get('/quiz/quizzes/')
      setQuizzes(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMyResults = async () => {
    try {
      const res = await api.get('/quiz/results/my-results/')
      setMyResults(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const addQuestion = () => {
    setNewQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, { text: '', choices: ['', '', '', ''], correct: 0 }]
    }))
  }

  const updateQuestion = (idx, field, value) => {
    setNewQuiz(prev => {
      const questions = [...prev.questions]
      questions[idx] = { ...questions[idx], [field]: value }
      return { ...prev, questions }
    })
  }

  const updateOption = (qIdx, oIdx, value) => {
    setNewQuiz(prev => {
      const questions = [...prev.questions]
      const options = [...questions[qIdx].choices]
      options[oIdx] = value
      questions[qIdx] = { ...questions[qIdx], choices: options }
      return { ...prev, questions }
    })
  }

  const removeQuestion = (idx) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }))
  }

  const handleCreateQuiz = async () => {
    setSaving(true)
    try {
      const payload = {
        title: newQuiz.title,
        subject: newQuiz.subject,
        time_limit_minutes: newQuiz.time_limit_minutes,
        passing_score: newQuiz.passing_score,
        questions: newQuiz.questions
          .filter(q => q.text.trim())
          .map((q, idx) => ({
            text: q.text,
            order: idx + 1,
            choices: q.choices
              .filter(c => c.trim())
              .map((text, oi) => ({ text, is_correct: oi === q.correct })),
          })),
      }
      await api.post('/quiz/quizzes/', payload)
      setShowCreate(false)
      fetchQuizzes()
      setNewQuiz({
        title: '', subject: 'matematika', time_limit_minutes: 30, passing_score: 60,
        questions: [{ text: '', choices: ['', '', '', ''], correct: 0 }]
      })
    } catch (err) {
      console.error(err)
      alert('Test yaratishda xatolik: ' + (err.response?.data?.detail || err.response?.data?.teacher?.[0] || err.message))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Testlar yuklanmoqda...</p>
      </div>
    )
  }

  const isTeacher = user?.role === 'ustoz'

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">📝 Testlar</h1>
        <p className="page-subtitle">Bilim sinovlari</p>
        {isTeacher && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '✖ Bekor' : '➕ Yangi test yaratish'}
          </button>
        )}
      </div>

      {user?.role === 'oquvchi' && (
        <div className="admin-tabs">
          <button className={`tab-btn ${activeTab === 'quizzes' ? 'active' : ''}`} onClick={() => setActiveTab('quizzes')}>📝 Testlar</button>
          <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>📊 Natijalarim</button>
        </div>
      )}

      {showCreate && isTeacher && (
        <div className="edu-card create-quiz-card">
          <h3 className="edu-card-title">➕ Yangi test yaratish</h3>
          <div className="form-group">
            <label>Sarlavha</label>
            <input type="text" className="edu-input" value={newQuiz.title} onChange={e => setNewQuiz(p => ({ ...p, title: e.target.value }))} placeholder="Test nomi" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Fan</label>
              <select className="edu-input" value={newQuiz.subject} onChange={e => setNewQuiz(p => ({ ...p, subject: e.target.value }))}>
                <option value="ingliz_tili">Ingliz Tili</option>
                <option value="matematika">Matematika</option>
                <option value="rus_tili">Rus Tili</option>
                <option value="ozbek_tili">O'zbek Tili</option>
                <option value="fizika">Fizika</option>
                <option value="kimyo">Kimyo</option>
                <option value="biologiya">Biologiya</option>
                <option value="tarix">Tarix</option>
              </select>
            </div>
            <div className="form-group">
              <label>Vaqt (daqiqa)</label>
              <input type="number" className="edu-input" value={newQuiz.time_limit_minutes} onChange={e => setNewQuiz(p => ({ ...p, time_limit_minutes: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="form-group">
              <label>O'tish bali</label>
              <input type="number" className="edu-input" value={newQuiz.passing_score} onChange={e => setNewQuiz(p => ({ ...p, passing_score: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <h4 className="mt-2">Savollar</h4>
          {newQuiz.questions.map((q, qi) => (
            <div key={qi} className="question-editor">
              <div className="question-editor-header">
                <strong>Savol {qi + 1}</strong>
                {newQuiz.questions.length > 1 && (
                  <button className="btn btn-sm btn-danger" onClick={() => removeQuestion(qi)}>🗑️</button>
                )}
              </div>
              <input type="text" className="edu-input mb-1" placeholder="Savol matni..." value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)} />
              <div className="options-grid">
                {q.choices.map((opt, oi) => (
                  <div key={oi} className="option-input">
                    <input type="radio" name={`correct-${qi}`} checked={q.correct === oi} onChange={() => updateQuestion(qi, 'correct', oi)} />
                    <input type="text" className="edu-input" placeholder={`Variant ${oi + 1}`} value={opt} onChange={e => updateOption(qi, oi, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button className="btn btn-secondary mt-1" onClick={addQuestion}>➕ Savol qo'shish</button>
          <div className="mt-2">
            <button className="btn btn-primary" onClick={handleCreateQuiz} disabled={saving}>
              {saving ? 'Yaratilmoqda...' : '💾 Testni saqlash'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'quizzes' && (
        quizzes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Hozircha testlar yo'q</h3>
          </div>
        ) : (
          <div className={`quiz-gallery ${selectedId !== null ? 'quiz-gallery-spotlight' : ''}`}>
            <div className="quiz-gallery-header">
              <div>
                <h2 className="swiper-section-title glow-text">📋 Testlar galereyasi</h2>
                <p className="swiper-section-subtitle">{quizzes.length} ta test — kartani bosing, yaqindan ko'rinsin</p>
              </div>
            </div>
            <div
              className="quiz-gallery-grid"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null)
              }}
            >
              {quizzes.map((quiz, index) => {
                const s = getSubjectStyle(quiz.subject)
                const isSelected = selectedId === quiz.id
                return (
                  <div
                    key={quiz.id}
                    className={`gallery-quiz-item ${isSelected ? 'is-spotlight' : ''}`}
                    onClick={() => handleCardClick(quiz.id)}
                  >
                    <div
                      className="gallery-quiz-card"
                      style={{ '--card-accent': s.accent, '--card-bg': s.bg, '--i': index }}
                    >
                      <div className="gallery-quiz-top">
                        <span className="gallery-quiz-emoji">{s.emoji}</span>
                        <span className="gallery-quiz-count">❓ {quiz.total_questions || 0}</span>
                        {isSelected && (
                          <button
                            className="gallery-quiz-spotlight-close"
                            onClick={(e) => { e.stopPropagation(); setSelectedId(null) }}
                          >
                            ✖
                          </button>
                        )}
                      </div>
                      <h4 className="gallery-quiz-title">{quiz.title}</h4>
                      <div className="gallery-quiz-info">
                        <span>⏱ {quiz.time_limit_minutes || 30}m</span>
                        <span>🎯 {quiz.passing_score || 60}%</span>
                      </div>
                      {quiz.group_name && <span className="gallery-quiz-group">👥 {quiz.group_name}</span>}
                      <span className="gallery-quiz-subject-tag" style={{ background: s.bg, color: s.accent }}>
                        {quiz.subject_display || quiz.subject}
                      </span>
                      {isSelected && (
                        <span className="gallery-quiz-link" onClick={(e) => e.stopPropagation()}>
                          {user?.role === 'oquvchi' ? (
                            <Link to={`/quizzes/${quiz.id}/take`} className="gallery-quiz-start-link">
                              🚀 Testni boshlash
                            </Link>
                          ) : (
                            <span className="gallery-quiz-close-hint">Tanlandi — yopish uchun ✖</span>
                          )}
                        </span>
                      )}
                      {user?.role === 'oquvchi' && !isSelected && (
                        <span className="gallery-quiz-link gallery-quiz-open-hint">
                          Ko'rish 👁
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {activeTab === 'results' && (
        <>
          {myResults.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>Siz hali test topshirmagansiz</h3>
            </div>
          ) : (
            <div className="table-container">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Baho</th>
                    <th>Holat</th>
                    <th>Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {myResults.map((r, idx) => {
                    const pct = r.percentage ?? r.score ?? 0
                    return (
                      <tr key={r.id || idx}>
                        <td>{r.quiz_title || r.quiz?.title || 'Test'}</td>
                        <td><span className="badge badge-primary">{pct}%</span></td>
                        <td>
                          <span className={`badge ${(pct || 0) >= 60 ? 'badge-success' : 'badge-danger'}`}>
                            {(pct || 0) >= 60 ? '✅ O\'tdi' : '❌ O\'tmadi'}
                          </span>
                        </td>
                        <td>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
