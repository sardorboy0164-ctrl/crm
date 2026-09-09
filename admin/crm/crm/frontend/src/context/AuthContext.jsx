import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('access_token') || null)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (token) {
      api.get('/accounts/users/profile/')
        .then(res => {
          setUser(res.data)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    const ping = () => {
      api.post('/accounts/users/heartbeat/').catch(() => {})
    }
    ping()
    const interval = setInterval(ping, 30000)
    return () => clearInterval(interval)
  }, [token])

  const login = async (username, password) => {
    const res = await api.post('/accounts/login/', { username, password })
    const { tokens, user: userData } = res.data
    localStorage.setItem('access_token', tokens.access)
    if (tokens.refresh) localStorage.setItem('refresh_token', tokens.refresh)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(tokens.access)
    setUser(userData)
    return userData
  }

  const register = async (userData) => {
    const res = await api.post('/accounts/register/', userData)
    const { tokens, user: newUser } = res.data
    if (tokens) {
      localStorage.setItem('access_token', tokens.access)
      if (tokens.refresh) localStorage.setItem('refresh_token', tokens.refresh)
      localStorage.setItem('user', JSON.stringify(newUser))
      setToken(tokens.access)
      setUser(newUser)
    }
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <AuthContext.Provider value={{ user, setUser, token, theme, loading, login, register, logout, toggleTheme }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
