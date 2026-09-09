import { useAuth } from '../context/AuthContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAuth()

  return (
    <button className="theme-toggle" onClick={toggleTheme} title="Mavzuni o'zgartirish">
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
