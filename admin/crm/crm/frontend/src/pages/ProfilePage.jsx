import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
  })
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || '',
      })
      setAvatarPreview(user.avatar || null)
    }
  }, [user])

  const handleUpdate = async () => {
    setSaving(true)
    setMessage('')
    try {
      await api.patch('/accounts/users/profile/', formData)
      setMessage('✅ Profil yangilandi!')
      setEditing(false)
      const res = await api.get('/accounts/users/profile/')
      setUser(res.data)
    } catch (err) {
      setMessage("⚠️ Yangilashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async () => {
    if (!avatar) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('avatar', avatar)
      await api.patch('/accounts/users/profile/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setMessage('✅ Avatar yangilandi!')
      const res = await api.get('/accounts/users/profile/')
      setUser(res.data)
    } catch (err) {
      setMessage("⚠️ Avatar yuklashda xatolik")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage("⚠️ Parollar mos kelmaydi!")
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await api.post('/accounts/users/change-password/', {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      })
      setMessage('✅ Parol yangilandi!')
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
      setShowPassword(false)
    } catch (err) {
      setMessage('⚠️ ' + (err.response?.data?.detail || 'Parol xatosi'))
    } finally {
      setSaving(false)
    }
  }

  const roleLabels = {
    admin: '👑 Admin',
    ustoz: '🎓 Ustoz',
    oquvchi: "📚 O'quvchi",
    ota_ona: '👨‍👩‍👧 Ota-ona',
    kurator: '📷 Kurator',
    intern: '🔰 Stajyor',
    qowimcha_ustoz: "🧑‍🏫 Qo'shimcha Ustoz",
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">👤 Profil</h1>
        <p className="page-subtitle">Shaxsiy ma'lumotlar</p>
      </div>

      {message && <div className={message.startsWith('✅') ? 'auth-success' : 'auth-error'}>{message}</div>}

      <div className="profile-layout">
        <div className="edu-card profile-avatar-card">
          <div className="profile-avatar-large">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" />
            ) : (
              <span>{user?.first_name?.[0] || user?.username?.[0] || '?'}</span>
            )}
          </div>
          <h2 className="profile-name">{user?.first_name} {user?.last_name}</h2>
          <span className={`role-badge role-${user?.role}`}>{roleLabels[user?.role] || user?.role}</span>
          <span className="text-muted">@{user?.username}</span>

          <div className="profile-avatar-upload mt-2">
            <input type="file" accept="image/*" onChange={e => {
              setAvatar(e.target.files[0])
              setAvatarPreview(URL.createObjectURL(e.target.files[0]))
            }} />
            {avatar && (
              <button className="btn btn-primary btn-full mt-1" onClick={handleAvatarUpload} disabled={saving}>
                📷 Avatarni yangilash
              </button>
            )}
          </div>

          <div className="profile-coins mt-2">
            <span className="coin-icon-lg">🪙</span>
            <span className="glow-text">{user?.coin_balance || 0} coin</span>
          </div>
        </div>

        <div className="profile-details">
          <div className="edu-card">
            <div className="card-header-between">
              <h3 className="edu-card-title">📝 Shaxsiy ma'lumotlar</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditing(!editing)}>
                {editing ? '✖ Bekor' : '✏️ Tahrirlash'}
              </button>
            </div>
            <div className="profile-fields">
              <div className="form-group">
                <label>Ism</label>
                {editing ? (
                  <input type="text" className="edu-input" value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
                ) : (
                  <p className="profile-value">{user?.first_name || '—'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Familiya</label>
                {editing ? (
                  <input type="text" className="edu-input" value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
                ) : (
                  <p className="profile-value">{user?.last_name || '—'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Email</label>
                {editing ? (
                  <input type="email" className="edu-input" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                ) : (
                  <p className="profile-value">{user?.email || '—'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Telefon</label>
                {editing ? (
                  <input type="text" className="edu-input" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                ) : (
                  <p className="profile-value">{user?.phone || '—'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Tug'ilgan sana</label>
                {editing ? (
                  <input type="date" className="edu-input" value={formData.date_of_birth} onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
                ) : (
                  <p className="profile-value">{user?.date_of_birth || '—'}</p>
                )}
              </div>
            </div>
            {editing && (
              <button className="btn btn-primary mt-1" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : '💾 Saqlash'}
              </button>
            )}
          </div>

          <div className="edu-card mt-2">
            <div className="card-header-between">
              <h3 className="edu-card-title">🔒 Parolni o'zgartirish</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '✖' : '✏️'}
              </button>
            </div>
            {showPassword && (
              <div className="password-form">
                <div className="form-group">
                  <label>Joriy parol</label>
                  <input type="password" className="edu-input" value={passwordData.old_password} onChange={e => setPasswordData(p => ({ ...p, old_password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Yangi parol</label>
                  <input type="password" className="edu-input" value={passwordData.new_password} onChange={e => setPasswordData(p => ({ ...p, new_password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Parolni tasdiqlang</label>
                  <input type="password" className="edu-input" value={passwordData.confirm_password} onChange={e => setPasswordData(p => ({ ...p, confirm_password: e.target.value }))} />
                </div>
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : '🔒 Parolni yangilash'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
