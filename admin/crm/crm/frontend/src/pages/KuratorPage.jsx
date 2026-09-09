import { useState, useEffect } from 'react'
import api from '../api'

export default function KuratorPage() {
  const [groups, setGroups] = useState([])
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('upload')
  const [formData, setFormData] = useState({
    group: '', description: '', topic: '', photo: null
  })
  const [students, setStudents] = useState([])
  const [statusForm, setStatusForm] = useState({ student: '', status: '', comment: '' })
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [groupsRes, photosRes, studentsRes] = await Promise.all([
        api.get('/academy/groups/'),
        api.get('/kurator/photos/').catch(() => ({ data: [] })),
        api.get('/kurator/statuses/my-students/').catch(() => ({ data: [] }))
      ])
      setGroups(groupsRes.data?.results || groupsRes.data || [])
      setPhotos(photosRes.data?.results || photosRes.data || [])
      setStudents(studentsRes.data?.results || studentsRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStatus = async () => {
    if (!statusForm.student || !statusForm.status) {
      setStatusMsg('⚠️ O\'quvchi va holatni tanlang!')
      return
    }
    try {
      await api.post('/kurator/statuses/', {
        student: statusForm.student,
        status: statusForm.status,
        comment: statusForm.comment,
      })
      setStatusMsg('✅ Holat saqlandi!')
      setStatusForm({ student: '', status: '', comment: '' })
      fetchData()
    } catch (err) {
      setStatusMsg('⚠️ Saqlashda xatolik')
    }
  }

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, photo: e.target.files[0] }))
  }

  const handleUpload = async () => {
    if (!formData.group || !formData.photo) {
      setMessage("⚠️ Guruh va surat tanlash shart!")
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const fd = new FormData()
      fd.append('group', formData.group)
      fd.append('description', formData.description)
      fd.append('lesson_topic', formData.topic)
      fd.append('photo', formData.photo)
      fd.append('date', new Date().toISOString().split('T')[0])
      await api.post('/kurator/photos/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setMessage('✅ Surat muvaffaqiyatli yuklandi!')
      setFormData({ group: '', description: '', topic: '', photo: null })
      fetchData()
    } catch (err) {
      setMessage('⚠️ Yuklashda xatolik')
    } finally {
      setUploading(false)
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
        <h1 className="page-title glow-text">📷 Kurator sahifasi</h1>
        <p className="page-subtitle">Suratlar va hisobotlar</p>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>📷 Surat yuklash</button>
        <button className={`tab-btn ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>🖼️ Galereya ({photos.length})</button>
        <button className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>📊 O\'quvchi holati</button>
      </div>

      {message && <div className={message.startsWith('✅') ? 'auth-success' : 'auth-error'}>{message}</div>}

      {activeTab === 'upload' && (
        <div className="edu-card">
          <h3 className="edu-card-title">📷 Yangi surat yuklash</h3>
          <div className="form-group">
            <label>Guruh</label>
            <select className="edu-input" value={formData.group} onChange={e => setFormData(p => ({ ...p, group: e.target.value }))}>
              <option value="">— Guruh tanlang —</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mavzu</label>
            <input type="text" className="edu-input" value={formData.topic} onChange={e => setFormData(p => ({ ...p, topic: e.target.value }))} placeholder="Dars mavzusi..." />
          </div>
          <div className="form-group">
            <label>Tavsif</label>
            <textarea className="edu-input" rows="3" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Surat haqida..."></textarea>
          </div>
          <div className="form-group">
            <label>Surat</label>
            <input type="file" className="edu-input" accept="image/*" onChange={handleFileChange} />
          </div>
          {formData.photo && (
            <div className="photo-preview">
              <img src={URL.createObjectURL(formData.photo)} alt="Preview" className="preview-img" />
            </div>
          )}
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Yuklanmoqda...' : '📤 Yuklash'}
          </button>
        </div>
      )}

      {activeTab === 'gallery' && (
        <>
          {photos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🖼️</div>
              <h3>Hozircha suratlar yo'q</h3>
            </div>
          ) : (
            <div className="cards-grid">
              {photos.map(photo => (
                <div key={photo.id} className="edu-card photo-card">
                  <div className="photo-image">
                    <img src={photo.photo || photo.image || ''} alt={photo.topic || 'Photo'} />
                  </div>
                  <div className="photo-info">
                    <h4>{photo.topic || 'Surat'}</h4>
                    <p>{photo.description || ''}</p>
                    <span className="text-muted">{photo.group_name || photo.group?.name || ''}</span>
                    <span className="text-muted">{photo.created_at ? new Date(photo.created_at).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'status' && (
        <>
          {statusMsg && <div className={statusMsg.startsWith('✅') ? 'auth-success' : 'auth-error'}>{statusMsg}</div>}
          <div className="edu-card">
            <h3 className="edu-card-title">📊 O\'quvchi holatini belgilash</h3>
            <div className="form-group">
              <label>O\'quvchi</label>
              <select className="edu-input" value={statusForm.student} onChange={e => setStatusForm(p => ({ ...p, student: e.target.value }))}>
                <option value="">— O\'quvchini tanlang —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}{s.status ? ` (${s.status === 'ijobiy' ? '✅ Ijobiy' : '❌ Salbiy'})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Holat</label>
              <div className="status-select-row">
                <button
                  type="button"
                  className={`btn ${statusForm.status === 'ijobiy' ? 'btn-success' : 'btn-secondary'}`}
                  onClick={() => setStatusForm(p => ({ ...p, status: 'ijobiy' }))}
                >✅ Ijobiy</button>
                <button
                  type="button"
                  className={`btn ${statusForm.status === 'salbiy' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setStatusForm(p => ({ ...p, status: 'salbiy' }))}
                >❌ Salbiy</button>
              </div>
            </div>
            <div className="form-group">
              <label>Izoh</label>
              <textarea className="edu-input" rows="3" value={statusForm.comment} onChange={e => setStatusForm(p => ({ ...p, comment: e.target.value }))} placeholder="O\'quvchi haqida izoh..."></textarea>
            </div>
            <button className="btn btn-primary" onClick={handleSaveStatus} disabled={!statusForm.student || !statusForm.status}>
              💾 Saqlash
            </button>
          </div>

          <div className="section">
            <h2 className="section-title">O\'quvchilar ro\'yxati va holati</h2>
            {students.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎓</div>
                <h3>O\'quvchilar topilmadi</h3>
                <p className="text-muted">Guruhlaringizga o\'quvchilar qo\'shilmagan</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="edu-table">
                  <thead>
                    <tr>
                      <th>O\'quvchi</th>
                      <th>Holat</th>
                      <th>Izoh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id}>
                        <td><strong>{s.first_name} {s.last_name}</strong></td>
                        <td>
                          {!s.status ? (
                            <span className="badge badge-warning">Belgilanmagan</span>
                          ) : s.status === 'ijobiy' ? (
                            <span className="badge badge-success">✅ Ijobiy</span>
                          ) : (
                            <span className="badge badge-danger">❌ Salbiy</span>
                          )}
                        </td>
                        <td>{s.comment || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
