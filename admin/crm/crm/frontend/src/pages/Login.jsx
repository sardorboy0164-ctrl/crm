import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Login xatosi. Qaytadan urinib ko\'ring.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-hero">
            <h1 className="auth-title glow-text">📚 Manga CRM</h1>
            <p className="auth-subtitle">Ta'lim Platformasiga Xush Kelibsiz!</p>
            <div className="auth-features">
              <div className="auth-feature">📝 Interaktiv testlar</div>
              <div className="auth-feature">⚔️ Bilim janglari</div>
              <div className="auth-feature">🪙 Coin tizimi</div>
              <div className="auth-feature">📊 Davomat nazorati</div>
            </div>
          </div>
        </div>
        <div className="auth-right">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2 className="auth-form-title">Kirish</h2>
            {error && <div className="auth-error">⚠️ {error}</div>}
            <div className="form-group">
              <label htmlFor="username">Foydalanuvchi nomi</label>
              <input
                type="text"
                id="username"
                className="edu-input"
                placeholder="Username kiriting..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Parol</label>
              <input
                type="password"
                id="password"
                className="edu-input"
                placeholder="Parol kiriting..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                  <span className="loading-dot"></span>
                </span>
              ) : (
                '🚀 Kirish'
              )}
            </button>
            <p className="auth-link">
              Hisobingiz yo'qmi?{' '}
              <Link to="/register">Ro'yxatdan o'ting</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
