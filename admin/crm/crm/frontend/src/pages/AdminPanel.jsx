import { useState, useEffect, useCallback } from 'react'
import api from '../api'

const roleLabels = {
  admin: 'Admin',
  ustoz: 'Ustoz',
  oquvchi: "O'quvchi",
  ota_ona: 'Ota-ona',
  kurator: 'Kurator',
  intern: 'Stajyor',
  qowimcha_ustoz: "Qo'shimcha Ustoz",
}

const roleIcons = {
  admin: '👑',
  ustoz: '🎓',
  oquvchi: '📚',
  ota_ona: '👨‍👩‍👧',
  kurator: '📷',
  intern: '🔰',
  qowimcha_ustoz: '🧑‍🏫',
}

const subjectLabels = {
  ielts_7: 'IELTS 7+',
  general_english: 'General English',
  ingliz_tili: 'Ingliz tili',
  rus_tili: 'Rus tili',
  arab_tili: 'Arab tili',
  koreys_tili: 'Koreys tili',
  turk_tili: 'Turk tili',
  matematika: 'Matematika',
  ozbek_tili: "O'zbek Tili",
  fizika: 'Fizika',
  kimyo: 'Kimyo',
  biologiya: 'Biologiya',
  tarix: 'Tarix',
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [notifications, setNotifications] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)
  const [showCoinModal, setShowCoinModal] = useState(false)
  const [coinAmount, setCoinAmount] = useState(10)
  const [coinRole, setCoinRole] = useState('oquvchi')
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingUsers, setPendingUsers] = useState([])
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [studentTarget, setStudentTarget] = useState(null)
  const [studentGroups, setStudentGroups] = useState([])
  const [addGroupId, setAddGroupId] = useState('')
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkParent, setLinkParent] = useState('')
  const [linkStudent, setLinkStudent] = useState('')
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usersRes, groupsRes, teachersRes, pendingRes] = await Promise.all([
        api.get('/accounts/users/'),
        api.get('/academy/groups/'),
        api.get('/accounts/users/teachers/'),
        api.get('/accounts/users/pending/'),
      ])
      setUsers(usersRes.data?.results || usersRes.data || [])
      setGroups(groupsRes.data?.results || groupsRes.data || [])
      setTeachers(teachersRes.data || [])
      setPendingUsers(pendingRes.data?.results || pendingRes.data || [])
    } catch (err) {
      setError("Ma'lumotlarni yuklashda xatolik")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/accounts/notifications/')
      setNotifications(res.data?.results || res.data || [])
      const countRes = await api.get('/accounts/notifications/unread_count/')
      setUnreadCount(countRes.data?.count || 0)
    } catch (err) {
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchNotifications()
  }, [fetchData, fetchNotifications])

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications()
    }
  }, [activeTab, fetchNotifications])

  const openCreateModal = (type) => {
    setModalType(type)
    setEditingItem(null)
    setFormData(type === 'user' ? {
      username: '', email: '', first_name: '', last_name: '', role: 'oquvchi', phone: '', password: '', password_confirm: ''
    } : {
      name: '', subject: 'ielts_7', schedule: '', room: '', max_students: 20
    })
    setShowModal(true)
  }

  const openEditModal = (type, item) => {
    setModalType(type)
    setEditingItem(item)
    setFormData({ ...item })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (modalType === 'user') {
        if (editingItem) {
          const { new_password, ...updateData } = formData
          await api.put(`/accounts/users/${editingItem.id}/`, updateData)
          if (new_password && new_password.length >= 6) {
            await api.post(`/accounts/users/${editingItem.id}/admin-reset-password/`, { new_password: new_password })
          }
        } else {
          await api.post('/accounts/register/', formData)
        }
      } else if (modalType === 'group') {
        if (editingItem) {
          await api.put(`/academy/groups/${editingItem.id}/`, formData)
        } else {
          await api.post('/academy/groups/', formData)
        }
      }
      setShowModal(false)
      setSuccess('Muvaffaqiyatli saqlandi!')
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.detail || "Saqlashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type, id) => {
    if (!confirm("O'chirishga ishonchingiz komilmi?")) return
    try {
      if (type === 'user') await api.delete(`/accounts/users/${id}/`)
      else if (type === 'group') await api.delete(`/academy/groups/${id}/`)
      setSuccess("Muvaffaqiyatli o'chirildi!")
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError("O'chirishda xatolik")
    }
  }

  const handleDistributeCoins = async () => {
    try {
      const res = await api.post('/accounts/users/distribute-coins/', { amount: coinAmount, role: coinRole })
      setShowCoinModal(false)
      setSuccess(res.data?.detail || "Coinlar taqsimlandi!")
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || "Xatolik")
    }
  }

  const openStudentGroups = async (user) => {
    setStudentTarget(user)
    setAddGroupId('')
    setShowStudentModal(true)
    try {
      const res = await api.get(`/academy/group-students/?student=${user.id}&is_active=true`)
      setStudentGroups(res.data?.results || res.data || [])
    } catch (err) {
      setStudentGroups([])
    }
  }

  const addStudentToGroup = async () => {
    if (!studentTarget || !addGroupId) return
    try {
      await api.post(`/accounts/users/${studentTarget.id}/assign-group/`, { group_id: parseInt(addGroupId) })
      setAddGroupId('')
      setSuccess(`${studentTarget.first_name} ${studentTarget.last_name} guruhga qo'shildi!`)
      setTimeout(() => setSuccess(''), 3000)
      openStudentGroups(studentTarget)
    } catch (err) {
      setError(err.response?.data?.detail || "Xatolik")
    }
  }

  const openLinkModal = (user) => {
    setLinkParent(user ? String(user.id) : '')
    setLinkStudent('')
    setShowLinkModal(true)
  }

  const handleLinkParent = async () => {
    if (!linkParent || !linkStudent) return
    try {
      await api.post('/accounts/parent-students/', {
        parent: parseInt(linkParent),
        student: parseInt(linkStudent),
      })
      setShowLinkModal(false)
      setSuccess("Ota-ona o'quvchiga bog'landi!")
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || "Xatolik")
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return
    try {
      await api.post(`/accounts/users/${resetPasswordUser.id}/admin-reset-password/`, { new_password: newPassword })
      setShowResetPasswordModal(false)
      setResetPasswordUser(null)
      setNewPassword('')
      setSuccess(`${resetPasswordUser.first_name} ${resetPasswordUser.last_name} paroli yangilandi!`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || "Parolni yangilashda xatolik")
    }
  }

  const handleApprove = async (user, role) => {
    try {
      const res = await api.post(`/accounts/users/${user.id}/approve/`, role ? { role } : {})
      setSuccess(res.data?.detail || "Tasdiqlandi!")
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || "Xatolik")
    }
  }

  const handleReject = async (user) => {
    if (!confirm(`${user.first_name} ${user.last_name} ni bekor qilishni tasdiqlaysizmi?`)) return
    try {
      await api.post(`/accounts/users/${user.id}/reject/`)
      setSuccess("Bekor qilindi!")
      setTimeout(() => setSuccess(''), 3000)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.detail || "Xatolik")
    }
  }

  const markAsRead = async (id) => {
    try {
      await api.post(`/accounts/notifications/${id}/read/`)
      fetchNotifications()
    } catch (err) {
    }
  }

  const markAllRead = async () => {
    try {
      await api.post('/accounts/notifications/read_all/')
      fetchNotifications()
    } catch (err) {
    }
  }

  const toggleActive = async (user) => {
    try {
      await api.patch(`/accounts/users/${user.id}/`, { is_active: !user.is_active })
      fetchData()
    } catch (err) {
      setError("O'zgartirishda xatolik")
    }
  }

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    totalUsers: users.length,
    students: users.filter(u => u.role === 'oquvchi').length,
    teachers: users.filter(u => u.role === 'ustoz' || u.role === 'qowimcha_ustoz').length,
    groups: groups.length,
    activeUsers: users.filter(u => u.is_active).length,
  }

  const tabs = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'users', icon: '👥', label: 'Foydalanuvchilar', count: users.length },
    { id: 'groups', icon: '📋', label: 'Guruhlar', count: groups.length },
    { id: 'pending', icon: '⏳', label: 'Tasdiqlash kutilmoqda', count: pendingUsers.length },
    { id: 'notifications', icon: '🔔', label: 'Bildirishnomalar', count: unreadCount },
  ]

  return (
    <div className="page">
      <div className="admin-panel-header">
        <div className="admin-panel-header-left">
          <div className="admin-crown">👑</div>
          <div>
            <h1 className="admin-panel-title">Admin Panel</h1>
            <p className="admin-panel-subtitle">O'quv markazi boshqaruvi</p>
          </div>
        </div>
        <div className="admin-panel-header-right">
          <div className="admin-panel-badge">
            <span className="admin-badge-icon">🛡️</span>
            <span>ADMIN</span>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setSearchQuery('') }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && <span className="tab-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {error && <div className="auth-error">⚠️ {error}</div>}
      {success && <div className="auth-success">✅ {success}</div>}

      {loading ? (
        <div className="page-loading">
          <div className="loading-spinner"></div>
          <p>Yuklanmoqda...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="admin-dashboard">
              <div className="stats-grid">
                <div className="stat-card stat-card-primary">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <span className="stat-number">{stats.totalUsers}</span>
                    <span className="stat-label">Jami foydalanuvchilar</span>
                  </div>
                </div>
                <div className="stat-card stat-card-success">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <span className="stat-number">{stats.students}</span>
                    <span className="stat-label">O'quvchilar</span>
                  </div>
                </div>
                <div className="stat-card stat-card-accent">
                  <div className="stat-icon">🎓</div>
                  <div className="stat-info">
                    <span className="stat-number">{stats.teachers}</span>
                    <span className="stat-label">Ustozlar</span>
                  </div>
                </div>
                <div className="stat-card stat-card-secondary">
                  <div className="stat-icon">📋</div>
                  <div className="stat-info">
                    <span className="stat-number">{stats.groups}</span>
                    <span className="stat-label">Guruhlar</span>
                  </div>
                </div>
              </div>

              <div className="admin-quick-actions">
                <h3 className="section-title">Tezkor amallar</h3>
                <div className="quick-actions-grid">
                  <button className="quick-action-card" onClick={() => { setActiveTab('users'); openCreateModal('user') }}>
                    <span className="quick-action-icon">➕</span>
                    <span className="quick-action-label">Yangi foydalanuvchi</span>
                  </button>
                  <button className="quick-action-card" onClick={() => { setActiveTab('groups'); openCreateModal('group') }}>
                    <span className="quick-action-icon">📋</span>
                    <span className="quick-action-label">Yangi guruh</span>
                  </button>
                  <button className="quick-action-card" onClick={() => setShowCoinModal(true)}>
                    <span className="quick-action-icon">🪙</span>
                    <span className="quick-action-label">Coin taqsimlash</span>
                  </button>
                  <button className="quick-action-card" onClick={() => setActiveTab('notifications')}>
                    <span className="quick-action-icon">🔔</span>
                    <span className="quick-action-label">
                      Bildirishnomalar
                      {unreadCount > 0 && <span className="quick-action-badge">{unreadCount}</span>}
                    </span>
                  </button>
                </div>
              </div>

              <div className="admin-recent-section">
                <h3 className="section-title">So'nggi ro'yxatdan o'tganlar</h3>
                <div className="table-container">
                  <table className="edu-table">
                    <thead>
                      <tr>
                        <th>Foydalanuvchi</th>
                        <th>Rol</th>
                        <th>Sana</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(0, 5).map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-cell-avatar">{u.first_name?.[0] || u.username?.[0]}</div>
                              <span>{u.first_name} {u.last_name}</span>
                            </div>
                          </td>
                          <td><span className={`role-badge role-${u.role}`}>{roleLabels[u.role]}</span></td>
                          <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('uz-UZ') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <>
              <div className="admin-toolbar">
                <input
                  type="text"
                  className="edu-input search-input"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary" onClick={() => openCreateModal('user')}>
                  + Yangi foydalanuvchi
                </button>
              </div>
              <div className="table-container">
                <table className="edu-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Foydalanuvchi</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Telefon</th>
                      <th>Coin</th>
                      <th>Holat</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan="8" className="text-center">Foydalanuvchilar topilmadi</td></tr>
                    ) : filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>
                          <div className="user-cell">
                            <div className="user-cell-avatar">{u.first_name?.[0] || u.username?.[0]}</div>
                            <div className="user-cell-info">
                              <span className="user-cell-name">{u.first_name} {u.last_name}</span>
                              <span className="user-cell-username">@{u.username}</span>
                            </div>
                          </div>
                        </td>
                        <td>{u.email || '—'}</td>
                        <td><span className={`role-badge role-${u.role}`}>{roleIcons[u.role]} {roleLabels[u.role]}</span></td>
                        <td>{u.phone || '—'}</td>
                        <td><span className="coin-badge">{u.coin_balance || 0}</span></td>
                        <td>
                          <button
                            className={`status-toggle ${u.is_active ? 'status-active' : 'status-inactive'}`}
                            onClick={() => toggleActive(u)}
                          >
                            {u.is_active ? 'Faol' : 'Nofaol'}
                          </button>
                        </td>
                        <td>
                          <div className="action-btns">
                            {u.role === 'oquvchi' && (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => openStudentGroups(u)}
                                title="Guruhlarini ko'rish / guruhga qo'shish"
                              >
                                📚
                              </button>
                            )}
                            {u.role === 'ota_ona' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => openLinkModal(u)}
                                title="Farzandni bog'lash"
                              >
                                👨‍👧
                              </button>
                            )}
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => { setResetPasswordUser(u); setNewPassword(''); setShowResetPasswordModal(true) }}
                              title="Parolni tiklash"
                            >
                              🔑
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={() => openEditModal('user', u)}>
                              ✏️
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete('user', u.id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <>
              <div className="admin-toolbar">
                <h3 className="section-title" style={{ marginBottom: 0 }}>
                  Tasdiqlash kutilayotgan ro'yxatdan o'tishlar ({pendingUsers.length})
                </h3>
                <span className="badge badge-warning">Bir hafta ichida tasdiqlanmasa o'quvchi bo'lib qoladi</span>
              </div>
              {pendingUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>Barchasi tasdiqlangan</h3>
                </div>
              ) : (
                <div className="table-container">
                  <table className="edu-table">
                    <thead>
                      <tr>
                        <th>Foydalanuvchi</th>
                        <th>Rol</th>
                        <th>Telefon</th>
                        <th>Sana</th>
                        <th>Amallar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-cell-avatar">{u.first_name?.[0] || u.username?.[0] || '?'}</div>
                              <div className="user-cell-info">
                                <span className="user-cell-name">{u.first_name} {u.last_name}</span>
                                <span className="user-cell-username">@{u.username}</span>
                              </div>
                            </div>
                          </td>
                          <td><span className={`role-badge role-${u.role}`}>{roleLabels[u.role] || u.role}</span></td>
                          <td>{u.phone || '—'}</td>
                          <td>{u.created_at ? new Date(u.created_at).toLocaleDateString('uz-UZ') : '—'}</td>
                          <td>
                            <div className="action-btns">
                              <select
                                className="edu-input"
                                value={u.role || 'oquvchi'}
                                onChange={e => handleApprove(u, e.target.value)}
                                title="Rolni tanlab tasdiqlang"
                              >
                                <option value="oquvchi">Tasdiqlash: O'quvchi</option>
                                <option value="ota_ona">Tasdiqlash: Ota-ona</option>
                                <option value="ustoz">Tasdiqlash: Ustoz</option>
                                <option value="qowimcha_ustoz">Tasdiqlash: Qo'shimcha Ustoz</option>
                                <option value="kurator">Tasdiqlash: Kurator</option>
                                <option value="intern">Tasdiqlash: Stajyor</option>
                              </select>
                              <button className="btn btn-sm btn-success" onClick={() => handleApprove(u, u.role)}>✅ Tasdiqlash</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleReject(u)}>🗑️ Bekor</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {activeTab === 'groups' && (
            <>
              <div className="admin-toolbar">
                <input
                  type="text"
                  className="edu-input search-input"
                  placeholder="Qidirish..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary" onClick={() => openCreateModal('group')}>
                  + Yangi guruh
                </button>
              </div>
              <div className="admin-groups-grid">
                {filteredGroups.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>Guruhlar topilmadi</h3>
                  </div>
                ) : filteredGroups.map(g => (
                  <div key={g.id} className="admin-group-card">
                    <div className="admin-group-card-header">
                      <h3>{g.name}</h3>
                      <span className={`subject-badge subject-${g.subject}`}>
                        {subjectLabels[g.subject] || g.subject}
                      </span>
                    </div>
                    <div className="admin-group-card-body">
                      <div className="admin-group-info-row">
                        <span className="admin-group-label">Ustoz:</span>
                        <span className="admin-group-value">
                          {g.teacher_name || g.teacher || 'Tayinlanmagan'}
                        </span>
                      </div>
                      <div className="admin-group-info-row">
                        <span className="admin-group-label">Kurator:</span>
                        <span className="admin-group-value">
                          {g.kurator_name || g.kurator || 'Tayinlanmagan'}
                        </span>
                      </div>
                      <div className="admin-group-info-row">
                        <span className="admin-group-label">Xona:</span>
                        <span className="admin-group-value">{g.room || '—'}</span>
                      </div>
                      <div className="admin-group-info-row">
                        <span className="admin-group-label">Jadval:</span>
                        <span className="admin-group-value">{g.schedule || '—'}</span>
                      </div>
                      <div className="admin-group-info-row">
                        <span className="admin-group-label">O'quvchilar:</span>
                        <span className="admin-group-value">{g.current_students_count || 0} / {g.max_students || 20}</span>
                      </div>
                    </div>
                    <div className="admin-group-card-footer">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEditModal('group', g)}>
                        ✏️ Tahrirlash
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete('group', g.id)}>
                        🗑️ O'chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
            <div className="admin-notifications">
              <div className="admin-toolbar">
                <h3 className="section-title" style={{ marginBottom: 0 }}>Barcha bildirishnomalar</h3>
                {unreadCount > 0 && (
                  <button className="btn btn-secondary" onClick={markAllRead}>
                    ✅ Barchasini o'qilgan deb belgilash
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🔔</div>
                  <h3>Bildirishnomalar yo'q</h3>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className={`notification-item ${n.is_read ? 'notification-read' : 'notification-unread'}`}
                      onClick={() => !n.is_read && markAsRead(n.id)}
                    >
                      <div className="notification-icon">
                        {n.notification_type === 'registration' ? '📝' : n.notification_type === 'assignment' ? '📋' : '🔔'}
                      </div>
                      <div className="notification-content">
                        <div className="notification-header">
                          <h4 className="notification-title">{n.title}</h4>
                          <span className="notification-time">
                            {new Date(n.created_at).toLocaleString('uz-UZ')}
                          </span>
                        </div>
                        <p className="notification-message">{n.message}</p>
                        {n.from_user_name && (
                          <span className="notification-from">Kimdan: {n.from_user_name}</span>
                        )}
                      </div>
                      {!n.is_read && <div className="notification-dot"></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Tahrirlash' : modalType === 'user' ? 'Yangi foydalanuvchi' : 'Yangi guruh'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {modalType === 'user' ? (
                <>
                  <div className="form-group">
                    <label>Foydalanuvchi nomi</label>
                    <input type="text" className="edu-input" value={formData.username || ''} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} disabled={!!editingItem} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Ism</label>
                      <input type="text" className="edu-input" value={formData.first_name || ''} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Familiya</label>
                      <input type="text" className="edu-input" value={formData.last_name || ''} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="edu-input" value={formData.email || ''} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Rol</label>
                    <select className="edu-input" value={formData.role || 'oquvchi'} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                      <option value="admin">Admin</option>
                      <option value="ustoz">Ustoz</option>
                      <option value="oquvchi">O'quvchi</option>
                      <option value="ota_ona">Ota-ona</option>
                      <option value="kurator">Kurator</option>
                      <option value="intern">Stajyor</option>
                      <option value="qowimcha_ustoz">Qo'shimcha Ustoz</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <input type="text" className="edu-input" value={formData.phone || ''} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  {!editingItem && (
                    <>
                      <div className="form-group">
                        <label>Parol</label>
                        <input type="password" className="edu-input" value={formData.password || ''} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Parolni tasdiqlang</label>
                        <input type="password" className="edu-input" value={formData.password_confirm || ''} onChange={e => setFormData(p => ({ ...p, password_confirm: e.target.value }))} />
                      </div>
                    </>
                  )}
                  {editingItem && (
                    <div className="form-group">
                      <label>Yangi parol (ixtiyoriy)</label>
                      <input type="text" className="edu-input" value={formData.new_password || ''} onChange={e => setFormData(p => ({ ...p, new_password: e.target.value }))} placeholder="Bo'sh qoldirsangiz parol o'zgarmaydi" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Guruh nomi</label>
                    <input type="text" className="edu-input" value={formData.name || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Fan</label>
                    <select className="edu-input" value={formData.subject || 'ielts_7'} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))}>
                      {Object.entries(subjectLabels).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Ustoz</label>
                    <select className="edu-input" value={formData.teacher || ''} onChange={e => setFormData(p => ({ ...p, teacher: e.target.value || null }))}>
                      <option value="">Tayinlanmagan</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Kurator</label>
                    <select className="edu-input" value={formData.kurator || ''} onChange={e => setFormData(p => ({ ...p, kurator: e.target.value || null }))}>
                      <option value="">Tayinlanmagan</option>
                      {users.filter(u => u.role === 'kurator').map(k => (
                        <option key={k.id} value={k.id}>{k.first_name} {k.last_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Xona</label>
                      <input type="text" className="edu-input" value={formData.room || ''} onChange={e => setFormData(p => ({ ...p, room: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Maks. o'quvchi</label>
                      <input type="number" className="edu-input" value={formData.max_students || 20} onChange={e => setFormData(p => ({ ...p, max_students: parseInt(e.target.value) || 20 }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Jadval</label>
                    <input type="text" className="edu-input" value={formData.schedule || ''} onChange={e => setFormData(p => ({ ...p, schedule: e.target.value }))} placeholder="Dush-Sesh-Pay 18:00-20:00" />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoinModal && (
        <div className="modal-overlay" onClick={() => setShowCoinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Coin taqsimlash</h2>
              <button className="modal-close" onClick={() => setShowCoinModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Qaysi ro'lga?</label>
                <select className="edu-input" value={coinRole} onChange={e => setCoinRole(e.target.value)}>
                  <option value="oquvchi">O'quvchilar</option>
                  <option value="ustoz">Ustozlar</option>
                  <option value="kurator">Kuratorlar</option>
                  <option value="barchasi">Barchasi</option>
                </select>
              </div>
              <div className="form-group">
                <label>Coin miqdori</label>
                <input type="number" className="edu-input" value={coinAmount} onChange={e => setCoinAmount(parseInt(e.target.value) || 0)} min="1" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCoinModal(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleDistributeCoins} disabled={coinAmount <= 0}>
                Taqsimlash
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentModal && (
        <div className="modal-overlay" onClick={() => setShowStudentModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>O'quvchining guruhlari</h2>
              <button className="modal-close" onClick={() => setShowStudentModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="mb-1">
                <strong>{studentTarget?.first_name} {studentTarget?.last_name}</strong> — guruhlari:
              </p>
              {studentGroups.length === 0 ? (
                <p className="text-muted">Hozircha guruhlar yo'q</p>
              ) : (
                <div className="student-groups-list">
                  {studentGroups.map(gs => (
                    <div key={gs.id} className="student-group-chip">
                      <span>{gs.group_name}</span>
                      <span className="badge badge-success">Faol</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-group mt-1">
                <label>Guruhga qo'shish</label>
                <div className="d-flex">
                  <select className="edu-input" value={addGroupId} onChange={e => setAddGroupId(e.target.value)}>
                    <option value="">Guruh tanlang...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({subjectLabels[g.subject] || g.subject})</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={addStudentToGroup} disabled={!addGroupId}>➕</button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStudentModal(false)}>Yopish</button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Ota-onaga farzand bog'lash</h2>
              <button className="modal-close" onClick={() => setShowLinkModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Ota-ona</label>
                <select className="edu-input" value={linkParent} onChange={e => setLinkParent(e.target.value)}>
                  <option value="">Ota-onani tanlang...</option>
                  {users.filter(u => u.role === 'ota_ona').map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} (@{u.username})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>O'quvchi</label>
                <select className="edu-input" value={linkStudent} onChange={e => setLinkStudent(e.target.value)}>
                  <option value="">O'quvchini tanlang...</option>
                  {users.filter(u => u.role === 'oquvchi').map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} (@{u.username})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowLinkModal(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleLinkParent} disabled={!linkParent || !linkStudent}>
                Bog'lash
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowResetPasswordModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔑 Parolni tiklash</h2>
              <button className="modal-close" onClick={() => setShowResetPasswordModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="mb-1">
                <strong>{resetPasswordUser?.first_name} {resetPasswordUser?.last_name}</strong> (@{resetPasswordUser?.username}) uchun yangi parol kiriting:
              </p>
              <div className="form-group">
                <label>Yangi parol</label>
                <input
                  type="text"
                  className="edu-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  minLength={6}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResetPasswordModal(false)}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 6}>
                ✅ Parolni yangilash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
