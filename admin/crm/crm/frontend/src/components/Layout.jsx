import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user } = useAuth()

  return (
    <div className="layout">
      <Sidebar user={user} />
      <div className="layout-main">
        <Navbar user={user} />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
