import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    phone: '',
    date_of_birth: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (formData.password !== formData.password_confirm) {
      setError('Parollar mos kelmaydi!')
      return
    }
    setLoading(true)
    try {
      await register(formData)
      setSuccess("Muvaffaqiyatli ro'yxatdan o'tdingiz! Tizimga kiring.")
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      const data = err.response?.data
      if (data) {
        const messages = Object.entries(data).map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`).join('\n')
        setError(messages)
      } else {
        setError("Ro'yxatdan o'tish xatosi.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-hero">
            <h1 className="auth-title">Manga CRM</h1>
            <p className="auth-subtitle">O'quv markazi tizimiga xush kelibsiz!</p>
            <div className="auth-features">
              <div className="auth-feature">📚 IELTS 7+, General English, Rus, Arab, Koreys, Turk tillari</div>
              <div className="auth-feature">📝 Testlar va baholar</div>
              <div className="auth-feature">⚔️ Bilimlar jangi</div>
              <div className="auth-feature">🪙 Coinlar va mukofotlar</div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="auth-form-title">Ro'yxatdan o'tish</h2>
            <p className="auth-form-subtitle">Barcha o'quvchilar uchun</p>
            {error && <div className="auth-error">{error}</div>}
            {success && <div className="auth-success">{success}</div>}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Foydalanuvchi nomi</label>
                <input type="text" id="username" name="username" className="edu-input" placeholder="Username" value={formData.username} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" className="edu-input" placeholder="email@example.com" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">Ism</label>
                <input type="text" id="first_name" name="first_name" className="edu-input" placeholder="Ism" value={formData.first_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="last_name">Familiya</label>
                <input type="text" id="last_name" name="last_name" className="edu-input" placeholder="Familiya" value={formData.last_name} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Telefon</label>
                <input type="text" id="phone" name="phone" className="edu-input" placeholder="+998 XX XXX XX XX" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label htmlFor="date_of_birth">Tug'ilgan sana</label>
                <input type="date" id="date_of_birth" name="date_of_birth" className="edu-input" value={formData.date_of_birth} onChange={handleChange} />
              </div>
            </div>

            <p className="auth-form-subtitle">Ro'yxatdan o'tganda siz o'quvchi sifatida qayd etilasiz — rolni faqat admin belgilaydi.</p>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Parol</label>
                <input type="password" id="password" name="password" className="edu-input" placeholder="Kamida 6 ta belgi" value={formData.password} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label htmlFor="password_confirm">Parolni tasdiqlang</label>
                <input type="password" id="password_confirm" name="password_confirm" className="edu-input" placeholder="Parolni qaytadan" value={formData.password_confirm} onChange={handleChange} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Yuklanmoqda...' : "Ro'yxatdan o'tish"}
            </button>
            <p className="auth-link">
              Hisobingiz bormi? <Link to="/login">Kirish</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
