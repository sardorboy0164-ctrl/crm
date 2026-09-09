import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    fetchGroups()
  }, [])

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

  const fetchStudents = async (groupId) => {
    setLoadingStudents(true)
    try {
      const res = await api.get(`/academy/groups/${groupId}/students/`)
      // Backend returns GroupStudent rows (id, student <-- just the student's numeric id,
      // student_name, ...), not the student's own first_name/username/email. Use the nested
      // student_detail object so the table actually has something to show.
      const list = (res.data?.results || res.data || []).map(gs => ({ ...gs.student_detail, group_student_id: gs.id }))
      setStudents(list)
    } catch (err) {
      console.error(err)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleGroupClick = (group) => {
    setSelectedGroup(group)
    fetchStudents(group.id)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Guruhlar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">👥 Guruhlar</h1>
        <p className="page-subtitle">{selectedGroup ? selectedGroup.name : 'Barcha guruhlar'}</p>
        {selectedGroup && (
          <button className="btn btn-secondary" onClick={() => { setSelectedGroup(null); setStudents([]) }}>
            ← Orqaga
          </button>
        )}
      </div>

      {!selectedGroup ? (
        <>
          {groups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>Guruhlar topilmadi</h3>
            </div>
          ) : (
            <div className="cards-grid">
              {groups.map(group => (
                <div key={group.id} className="edu-card group-card" onClick={() => handleGroupClick(group)}>
                  <div className="group-card-header">
                    <span className="group-icon">📋</span>
                    <h3>{group.name}</h3>
                  </div>
                  <div className="group-card-body">
                    <p><strong>Fan:</strong> {group.subject || '—'}</p>
                    <p><strong>Jadval:</strong> {group.schedule || '—'}</p>
                    <p><strong>O'quvchilar:</strong> {group.students_count || group.students?.length || '—'}</p>
                  </div>
                  <div className="group-card-footer">
                    <button className="btn btn-primary btn-full">Batafsil →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="group-detail">
          <div className="edu-card">
            <h3 className="edu-card-title">📋 {selectedGroup.name}</h3>
            <p><strong>Fan:</strong> {selectedGroup.subject || '—'}</p>
            <p><strong>Jadval:</strong> {selectedGroup.schedule || '—'}</p>
            {selectedGroup.description && <p><strong>Tavsif:</strong> {selectedGroup.description}</p>}
          </div>

          <div className="section">
            <h2 className="section-title">👥 O'quvchilar</h2>
            {loadingStudents ? (
              <div className="page-loading"><div className="loading-spinner"></div></div>
            ) : students.length === 0 ? (
              <div className="empty-state"><p>Guruhda o'quvchilar yo'q</p></div>
            ) : (
              <div className="table-container">
                <table className="edu-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ism</th>
                      <th>Foydalanuvchi</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => (
                      <tr key={s.group_student_id || s.id || idx}>
                        <td>{idx + 1}</td>
                        <td>{s.first_name} {s.last_name}</td>
                        <td>@{s.username}</td>
                        <td>{s.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
