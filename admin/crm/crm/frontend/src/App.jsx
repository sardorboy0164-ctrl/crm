import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminPanel from './pages/AdminPanel'
import AttendancePage from './pages/AttendancePage'
import QuizPage from './pages/QuizPage'
import QuizTake from './pages/QuizTake'
import BattlePage from './pages/BattlePage'
import BattleArena from './pages/BattleArena'
import CoinShop from './pages/CoinShop'
import PostsPage from './pages/PostsPage'
import KuratorPage from './pages/KuratorPage'
import GroupsPage from './pages/GroupsPage'
import HomeworkPage from './pages/HomeworkPage'
import ProfilePage from './pages/ProfilePage'
import ParentDashboard from './pages/ParentDashboard'
import NotFound from './pages/NotFound'
import ChatPage from './pages/ChatPage'
import MyStudentsPage from './pages/MyStudentsPage'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        } />
        <Route path="attendance" element={
          <ProtectedRoute roles={['ustoz', 'kurator', 'qowimcha_ustoz']}>
            <AttendancePage />
          </ProtectedRoute>
        } />
        <Route path="quizzes" element={<QuizPage />} />
        <Route path="quizzes/:id/take" element={
          <ProtectedRoute roles={['oquvchi']}>
            <QuizTake />
          </ProtectedRoute>
        } />
        <Route path="battles" element={
          <ProtectedRoute roles={['oquvchi', 'ustoz', 'qowimcha_ustoz']}>
            <BattlePage />
          </ProtectedRoute>
        } />
        <Route path="battles/:id" element={
          <ProtectedRoute roles={['oquvchi', 'ustoz', 'qowimcha_ustoz']}>
            <BattleArena />
          </ProtectedRoute>
        } />
        <Route path="coin-shop" element={
          <ProtectedRoute roles={['oquvchi']}>
            <CoinShop />
          </ProtectedRoute>
        } />
        <Route path="posts" element={<PostsPage />} />
        <Route path="kurator" element={
          <ProtectedRoute roles={['kurator']}>
            <KuratorPage />
          </ProtectedRoute>
        } />
        <Route path="groups" element={
          <ProtectedRoute roles={['admin', 'ustoz', 'kurator', 'oquvchi', 'ota_ona']}>
            <GroupsPage />
          </ProtectedRoute>
        } />
        <Route path="homework" element={
          <ProtectedRoute roles={['ustoz', 'oquvchi']}>
            <HomeworkPage />
          </ProtectedRoute>
        } />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="chat" element={
          <ProtectedRoute roles={['ustoz', 'ota_ona', 'kurator', 'admin']}>
            <ChatPage />
          </ProtectedRoute>
        } />
        <Route path="my-students" element={
          <ProtectedRoute roles={['qowimcha_ustoz']}>
            <MyStudentsPage />
          </ProtectedRoute>
        } />
        <Route path="parent" element={
          <ProtectedRoute roles={['ota_ona']}>
            <ParentDashboard />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
