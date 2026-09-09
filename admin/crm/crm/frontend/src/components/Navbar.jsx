import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import api from '../api'

export default function Navbar({ user }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const fetchNotifications = async () => {
    if (user?.role !== 'admin') return
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/accounts/notifications/'),
        api.get('/accounts/notifications/unread_count/'),
      ])
      setNotifications(notifRes.data?.results || notifRes.data || [])
      setUnreadCount(countRes.data?.count || 0)
    } catch (err) {
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAsRead = async (id) => {
    try {
      await api.post(`/accounts/notifications/${id}/read/`)
      fetchNotifications()
    } catch (err) {}
  }

  const markAllRead = async () => {
    try {
      await api.post('/accounts/notifications/read_all/')
      fetchNotifications()
    } catch (err) {}
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">Manga CRM</span>
      </div>
      <div className="navbar-actions">
        {user?.role === 'admin' && (
          <div className="navbar-notifications-wrapper" ref={dropdownRef}>
            <div
              className={`navbar-notifications ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              title="Bildirishnomalar"
            >
              <span className="notif-icon">🔔</span>
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </div>
            {showNotifDropdown && (
              <div className="notif-dropdown">
                <div className="notif-dropdown-header">
                  <h4>Bildirishnomalar</h4>
                  {unreadCount > 0 && (
                    <button className="notif-mark-all" onClick={markAllRead}>
                      Barchasini o'qish
                    </button>
                  )}
                </div>
                <div className="notif-dropdown-body">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">Bildirishnomalar yo'q</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.is_read ? '' : 'notif-unread'}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        <div className="notif-item-icon">
                          {n.notification_type === 'registration' ? '📝' : '🔔'}
                        </div>
                        <div className="notif-item-content">
                          <p className="notif-item-title">{n.title}</p>
                          <p className="notif-item-message">{n.message}</p>
                          <span className="notif-item-time">
                            {new Date(n.created_at).toLocaleString('uz-UZ')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="notif-dropdown-footer">
                    <button onClick={() => { navigate('/admin'); setShowNotifDropdown(false); }} className="notif-view-all">
                      Barchasini ko'rish
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="navbar-coins" title="Coinlar">
          <span className="coin-icon">🪙</span>
          <span className="coin-count">{user?.coin_balance ?? 0}</span>
        </div>
        <ThemeToggle />
        <div className="navbar-user" onClick={() => navigate('/profile')}>
          <div className="navbar-avatar">
            {user?.first_name?.[0] || user?.username?.[0] || '?'}
          </div>
          <span className="navbar-username">{user?.first_name || user?.username}</span>
        </div>
        <button className="btn btn-logout" onClick={handleLogout} title="Chiqish">
          🚪
        </button>
      </div>
    </nav>
  )
}
