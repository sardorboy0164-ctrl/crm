import { useState, useEffect, useCallback } from 'react'
import api from '../api'

const WEEKDAYS = [
  { key: 1, short: 'Dush', full: 'Dushanba' },
  { key: 2, short: 'Sesh', full: 'Seshanba' },
  { key: 3, short: 'Chor', full: 'Chorshanba' },
  { key: 4, short: 'Pay', full: 'Payshanba' },
  { key: 5, short: 'Jum', full: 'Juma' },
  { key: 6, short: 'Shan', full: 'Shanba' },
]

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
]

export default function StudentTutorRegistration() {
  const [teachers, setTeachers] = useState([])
  const [myRegs, setMyRegs] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [modalDay, setModalDay] = useState(null)
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [time, setTime] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [topic, setTopic] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const [tRes, rRes] = await Promise.all([
        api.get('/academy/additional-teachers/available-teachers/'),
        api.get('/academy/additional-teachers/my-registrations/'),
      ])
      const tData = tRes.data?.results || tRes.data || []
      const rData = rRes.data?.results || rRes.data || []
      setTeachers(Array.isArray(tData) ? tData : [])
      setMyRegs(Array.isArray(rData) ? rData : [])
    } catch (err) {
      setError('Ma\'lumotlarni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const today = new Date().getDay()
  const todayKey = today === 0 ? 7 : today

  const openModal = (dayKey) => {
    setModalDay(dayKey)
    setStep(1)
    setTime('')
    setTeacherId('')
    setTopic('')
    setError('')
    setMessage('')
  }

  const closeModal = () => {
    setModalDay(null)
    setBusy(false)
  }

  const isTimeTakenForTeacher = (t, weekday, tSlot) => {
    return (t.taken_slots || []).some(s => s.weekday === weekday && s.time === tSlot)
  }

  const submit = async () => {
    setError('')
    setMessage('')
    if (!time || !teacherId || !topic.trim()) {
      setError('Soat, ustoz va mavzuni to\'ldiring.')
      return
    }
    setBusy(true)
    try {
      const res = await api.post('/academy/additional-teachers/register/', {
        teacher_id: Number(teacherId),
        weekday: modalDay,
        time,
        subject: topic.trim(),
      })
      if (res.data) {
        setMessage('Dars belgilandi! ✅')
        setTimeout(() => setMessage(''), 3000)
        closeModal()
        fetchAll()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Belgilashda xatolik.')
      setTimeout(() => setError(''), 4000)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">Qo'shimcha dars</h2>
        <p className="text-muted">Yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="section">
      <div className="qd-card">
        <h2 className="qd-title">Qo'shimcha dars</h2>
        <div className="qd-day-row">
          {WEEKDAYS.map(d => {
            const booked = myRegs.filter(r => r.weekday === d.key)
            const isToday = d.key === todayKey
            return (
              <div key={d.key} className="qd-day-col">
                <span className={`qd-day-label ${isToday ? 'active' : ''}`}>{d.short}</span>
                <button
                  className={`qd-day-btn ${booked.length > 0 ? 'done' : ''}`}
                  onClick={() => !booked.length && openModal(d.key)}
                  disabled={booked.length > 0}
                  title={booked.length ? `Yozilgansiz: ${booked.map(b => b.time).join(', ')}` : 'Dars yozilish'}
                >
                  {booked.length > 0 ? '✓' : '+'}
                </button>
                {booked.length > 0 && (
                  <span className="qd-day-booked">{booked.map(b => `${b.time}${b.subject ? ' · ' + b.subject : ''}`).join(', ')}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {modalDay && (() => {
        const day = WEEKDAYS.find(d => d.key === modalDay)
        return (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="qd-title">Dars belgilash — {day.full}</h2>
                <button className="modal-close" onClick={closeModal}>✕</button>
              </div>
              <div className="modal-body">
                {error && <div className="auth-error">⚠️ {error}</div>}
                {message && <div className="auth-success">✅ {message}</div>}

                <div className="wizard-dots">
                  {[1, 2, 3].map(s => (
                    <span key={s} className={`wizard-dot ${s === step ? 'active' : ''} ${s < step ? 'done' : ''}`}></span>
                  ))}
                </div>

                {step === 1 && (
                  <>
                    <p className="wizard-label">Soatni tanlang</p>
                    <div className="time-slot-grid">
                      {TIME_SLOTS.map(t => (
                        <button
                          key={t}
                          className={`time-slot-chip ${time === t ? 'active' : ''}`}
                          onClick={() => setTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="wizard-label">Ustozni tanlang ({time})</p>
                    {teachers.length === 0 ? (
                      <p className="text-muted">Qo'shimcha ustozlar yo'q</p>
                    ) : (
                      <div className="teacher-pick-list">
                        {teachers.map(t => {
                          const taken = isTimeTakenForTeacher(t, modalDay, time)
                          return (
                            <button
                              key={t.id}
                              className={`teacher-pick-item ${teacherId === String(t.id) ? 'active' : ''} ${taken ? 'disabled' : ''}`}
                              disabled={taken}
                              onClick={() => setTeacherId(String(t.id))}
                            >
                              <div className="user-cell-avatar">{t.first_name?.[0] || '?'}</div>
                              <div className="teacher-pick-info">
                                <span className="teacher-pick-name">{t.first_name} {t.last_name}</span>
                                <span className="teacher-pick-subject">
                                  {taken ? 'Bu vaqt band' : (t.subjects && t.subjects.length ? t.subjects.join(', ') : 'Fanlar')}
                                </span>
                              </div>
                              {teacherId === String(t.id) && <span className="teacher-pick-check">✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}

                {step === 3 && (
                  <>
                    <p className="wizard-label">Mavzuni kiriting</p>
                    <input
                      className="edu-input"
                      placeholder="Masalan: Kasrlar, Tenses..."
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                    />
                    <p className="text-muted mt-1">Sho'ng'osi ustozga ko'rinadi.</p>
                  </>
                )}

                <div className="modal-footer">
                  {step > 1 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>← Orqaga</button>}
                  {step < 3 ? (
                    <button
                      className="btn btn-primary"
                      disabled={step === 1 ? !time : !teacherId}
                      onClick={() => setStep(step + 1)}
                    >
                      Keyingi →
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={submit} disabled={busy || !topic.trim()}>
                      {busy ? 'Yuklanmoqda...' : 'Dars belgilash'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
