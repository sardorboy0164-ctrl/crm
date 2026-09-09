import { useState, useEffect } from 'react'
import api from '../api'

export default function AttendancePage() {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedGroup) fetchStudents()
  }, [selectedGroup])

  const fetchGroups = async () => {
    try {
      const res = await api.get('/academy/groups/')
      setGroups(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await api.get(`/academy/groups/${selectedGroup}/students/`)
      // `student` is just the student's numeric id (a GroupStudent FK field), so it is always
      // truthy and `gs.student || gs` was picking it over the real object — collapsing every
      // student onto the same "undefined" key below and making one checkbox control them all.
      // Use the nested `student_detail` object (full user info) instead.
      const studentList = (res.data?.results || res.data || []).map(gs => gs.student_detail || gs)
      setStudents(studentList)
      const initial = {}
      studentList.forEach(s => { initial[s.id] = true })
      setAttendance(initial)
    } catch (err) {
      console.error(err)
      setStudents([])
    }
  }

  const fetchHistory = async () => {
    if (!selectedGroup) return
    try {
      const res = await api.get(`/academy/attendances/?group=${selectedGroup}`)
      setHistory(res.data?.results || res.data || [])
      setShowHistory(true)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setMessage('')
    try {
      const attendanceData = students.map(s => ({
        student: s.student || s.id,
        group: parseInt(selectedGroup),
        date,
        is_present: attendance[s.student || s.id] || false,
      }))
      await api.post('/academy/attendances/bulk-create/', {
        attendances: attendanceData,
      })
      setMessage('✅ Davomat muvaffaqiyatli saqlandi!')
    } catch (err) {
      setMessage('⚠️ Davomatni saqlashda xatolik')
    } finally {
      setSubmitting(false)
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
        <h1 className="page-title glow-text">✅ Davomat</h1>
        <p className="page-subtitle">O'quvchilar davomatini boshqarish</p>
      </div>

      <div className="attendance-controls">
        <div className="form-group">
          <label>Guruhni tanlang</label>
          <select className="edu-input" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
            <option value="">— Guruh tanlang —</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Sana</label>
          <input type="date" className="edu-input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <button className="btn btn-secondary" onClick={fetchHistory} disabled={!selectedGroup}>
          📋 Tarix
        </button>
      </div>

      {message && <div className={message.startsWith('✅') ? 'auth-success' : 'auth-error'}>{message}</div>}

      {selectedGroup && students.length > 0 && (
        <>
          <div className="section">
            <h2 className="section-title">📋 O'quvchilar ({students.length})</h2>
            <div className="attendance-list">
              {students.map(student => (
                <div key={student.id} className={`attendance-item ${attendance[student.id] ? 'present' : 'absent'}`}>
                  <div className="attendance-student">
                    <div className="user-cell-avatar">
                      {student.first_name?.[0] || student.username?.[0] || '?'}
                    </div>
                    <div className="attendance-student-info">
                      <span className="attendance-student-name">{student.first_name} {student.last_name}</span>
                      <span className="attendance-student-username">@{student.username}</span>
                    </div>
                  </div>
                  <label className="attendance-toggle">
                    <input
                      type="checkbox"
                      checked={attendance[student.id] || false}
                      onChange={() => toggleAttendance(student.id)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">{attendance[student.id] ? '✅ Bor' : '❌ Yo\'q'}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="attendance-actions">
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saqlanmoqda...' : '💾 Davomatni saqlash'}
            </button>
          </div>
        </>
      )}

      {selectedGroup && students.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon">👤</div>
          <h3>Guruhda o'quvchilar yo'q</h3>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="section">
          <h2 className="section-title">📋 Davomat tarixi</h2>
          <div className="table-container">
            <table className="edu-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>O'quvchi</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={idx}>
                    <td>{h.date || '—'}</td>
                    <td>{h.student_name || h.student?.first_name || '—'}</td>
                    <td><span className={`badge ${h.is_present ? 'badge-success' : 'badge-danger'}`}>{h.is_present ? 'Bor' : 'Yo\'q'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
