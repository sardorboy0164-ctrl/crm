import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../api'

const icon = {
  admin: '🛡️',
  dashboard: '🏠',
  groups: '👥',
  quizzes: '📝',
  posts: '📢',
  chat: '💬',
  attendance: '📋',
  homework: '📚',
  battles: '⚔️',
  coins: '🪙',
  parent: '👨‍👩‍👧',
  photo: '📷',
  students: '🎓',
}

const roleMenus = {
  admin: [
    { path: '/admin', icon: icon.admin, label: 'Admin Panel' },
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlar' },
    { path: '/quizzes', icon: icon.quizzes, label: 'Testlar' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
    { path: '/chat', icon: icon.chat, label: 'Chat' },
  ],
  ustoz: [
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlarim' },
    { path: '/attendance', icon: icon.attendance, label: 'Davomat' },
    { path: '/quizzes', icon: icon.quizzes, label: 'Testlar' },
    { path: '/homework', icon: icon.homework, label: 'Uy vazifalari' },
    { path: '/battles', icon: icon.battles, label: 'Janglar' },
    { path: '/chat', icon: icon.chat, label: 'Chat' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
  ],
  oquvchi: [
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlarim' },
    { path: '/quizzes', icon: icon.quizzes, label: 'Testlar' },
    { path: '/battles', icon: icon.battles, label: 'Janglar' },
    { path: '/homework', icon: icon.homework, label: 'Uy vazifalari' },
    { path: '/coin-shop', icon: icon.coins, label: "Coin Do'kon" },
    { path: '/chat', icon: icon.chat, label: 'Chat' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
  ],
  ota_ona: [
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/parent', icon: icon.parent, label: 'Bolalarim' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlar' },
    { path: '/quizzes', icon: icon.quizzes, label: 'Testlar' },
    { path: '/chat', icon: icon.chat, label: 'Chat' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
  ],
  kurator: [
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlarim' },
    { path: '/kurator', icon: icon.photo, label: 'Foto' },
    { path: '/chat', icon: icon.chat, label: 'Chat' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
  ],
  intern: [
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlar' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
  ],
  qowimcha_ustoz: [
    { path: '/my-students', icon: icon.students, label: "Bugungi o'quvchilarim" },
    { path: '/dashboard', icon: icon.dashboard, label: 'Dashboard' },
    { path: '/attendance', icon: icon.attendance, label: 'Davomat' },
    { path: '/groups', icon: icon.groups, label: 'Guruhlar' },
    { path: '/battles', icon: icon.battles, label: 'Janglar' },
    { path: '/posts', icon: icon.posts, label: 'Postlar' },
  ],
}

const roleLabels = {
  admin: 'Admin',
  ustoz: 'Ustoz',
  oquvchi: "O'quvchi",
  ota_ona: 'Ota-ona',
  kurator: 'Kurator',
  intern: 'Stajyor',
  qowimcha_ustoz: "Qo'shimcha Ustoz",
}

export default function Sidebar({ user }) {
  const menuItems = roleMenus[user?.role] || roleMenus.oquvchi
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user?.role !== 'admin') return
    const fetchCount = async () => {
      try {
        const res = await api.get('/accounts/notifications/unread_count/')
        setUnreadCount(res.data?.count || 0)
      } catch (err) {}
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">Manga CRM</span>
        </div>
        <span className={`role-badge role-${user?.role}`}>
          {roleLabels[user?.role] || user?.role}
        </span>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-label">{item.label}</span>
            {item.path === '/admin' && unreadCount > 0 && (
              <span className="sidebar-badge">{unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">
            {user?.first_name?.[0] || user?.username?.[0] || '?'}
          </div>
          <div className="sidebar-user-details">
            <span className="sidebar-user-name">{user?.first_name} {user?.last_name}</span>
            <span className="sidebar-user-role">{roleLabels[user?.role]}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
