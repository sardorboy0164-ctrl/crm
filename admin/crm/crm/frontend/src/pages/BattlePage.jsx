import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function BattlePage() {
  const { user } = useAuth()
  const [battles, setBattles] = useState([])
  const [myStats, setMyStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [subjects, setSubjects] = useState([])
  const [users, setUsers] = useState([])
  const [students, setStudents] = useState([])
  const [invites, setInvites] = useState([])
  const [createForm, setCreateForm] = useState({ subject: 'matematika', player2_id: '' })
  const [challengeSubject, setChallengeSubject] = useState('ingliz_tili')
  const [creating, setCreating] = useState(false)
  const [activeTab, setActiveTab] = useState('active')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchBattles()
    fetchUsers()
    fetchStudents()
    fetchInvites()
    const interval = setInterval(() => {
      fetchStudents(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const showMessage = (text) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 3000)
  }

  const fetchBattles = async () => {
    try {
      const res = await api.get('/battle/battles/')
      const data = res.data?.results || res.data || []
      setBattles(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await api.get('/accounts/users/')
      const data = res.data?.results || res.data || []
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchStudents = async () => {
    try {
      const res = await api.get('/accounts/users/students/')
      const data = res.data?.results || res.data || []
      const list = (Array.isArray(data) ? data : [])
        .filter(s => s.id !== user?.id)
        .sort((a, b) => {
          if ((a.is_online || false) !== (b.is_online || false)) return (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0)
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
        })
      setStudents(list)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchInvites = async () => {
    try {
      const res = await api.get('/battle/battle-invites/my-invites/')
      const data = res.data?.results || res.data || []
      setInvites(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateBattle = async () => {
    setCreating(true)
    try {
      const payload = {
        subject: createForm.subject,
        player2_id: createForm.player2_id ? parseInt(createForm.player2_id) : null,
      }
      await api.post('/battle/battles/create_battle/', payload)
      setShowCreate(false)
      fetchBattles()
      setCreateForm({ subject: 'matematika', player2_id: '' })
    } catch (err) {
      console.error(err)
      alert('Jang yaratishda xatolik: ' + (err.response?.data?.error || err.response?.data?.detail || err.message))
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (battleId) => {
    try {
      await api.post(`/battle/battles/${battleId}/join/`)
      fetchBattles()
    } catch (err) {
      console.error(err)
      alert('Qo\'shilishda xatolik: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleChallenge = async (student) => {
    try {
      await api.post('/battle/battle-invites/invite_battle/', {
        to_user_id: student.id,
        subject: challengeSubject,
      })
      showMessage(`⚡ ${student.first_name} ${student.last_name} ga chaqiriw yuborildi!`)
    } catch (err) {
      showMessage('⚠️ Chaqiriwda xatolik: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleAcceptInvite = async (inviteId) => {
    try {
      await api.post(`/battle/battle-invites/${inviteId}/accept/`)
      showMessage('✅ Chaqiriw qabul qilindi! Jang boshlandi.')
      fetchInvites()
      fetchBattles()
    } catch (err) {
      showMessage('⚠️ Xatolik: ' + (err.response?.data?.error || err.message))
    }
  }

  const handleRejectInvite = async (inviteId) => {
    try {
      await api.post(`/battle/battle-invites/${inviteId}/reject/`)
      fetchInvites()
    } catch (err) {
      console.error(err)
    }
  }

  const activeBattles = battles.filter(b => b.status === 'active' || b.status === 'waiting')
  const completedBattles = battles.filter(b => b.status === 'finished')

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Janglar yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">⚔️ Janglar</h1>
        <p className="page-subtitle">Bilim janglari maydoni — g'olibga 2 coin</p>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✖ Bekor' : '⚔️ Yangi jang'}
        </button>
      </div>

      {message && <div className="auth-success">{message}</div>}

      {showCreate && (
        <div className="edu-card">
          <h3 className="edu-card-title">⚔️ Yangi jang yaratish</h3>
          <div className="form-group">
            <label>Fan</label>
            <select className="edu-input" value={createForm.subject} onChange={e => setCreateForm(p => ({ ...p, subject: e.target.value }))}>
              <option value="ingliz_tili">Ingliz Tili</option>
              <option value="matematika">Matematika</option>
              <option value="rus_tili">Rus Tili</option>
              <option value="ozbek_tili">O'zbek Tili</option>
              <option value="fizika">Fizika</option>
              <option value="kimyo">Kimyo</option>
              <option value="biologiya">Biologiya</option>
              <option value="tarix">Tarix</option>
            </select>
          </div>
          <div className="form-group">
            <label>Raqib (ixtiyoriy)</label>
            <select className="edu-input" value={createForm.player2_id} onChange={e => setCreateForm(p => ({ ...p, player2_id: e.target.value }))}>
              <option value="">— Raqibsiz (kutish rejimi) —</option>
              {users.filter(u => u.role === 'oquvchi' || u.role === 'ustoz').map(u => (
                <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.username})</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleCreateBattle} disabled={creating}>
            {creating ? 'Yaratilmoqda...' : '⚔️ Jangni boshlash'}
          </button>
        </div>
      )}

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
          ⚔️ Faol janglar ({activeBattles.length + invites.length})
        </button>
        <button className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
          👥 O'quvchilar ({students.length})
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          📜 Tarix ({completedBattles.length})
        </button>
      </div>

      {activeTab === 'active' && (
        <>
          {invites.length > 0 && (
            <div className="section">
              <h2 className="section-title">📩 Kutilayotgan chaqiriqlar</h2>
              <div className="cards-grid">
                {invites.map(inv => (
                  <div key={inv.id} className="edu-card battle-card">
                    <div className="battle-card-vs">
                      <span className="battle-player">{inv.from_user_name}</span>
                      <span className="battle-vs-text">⚔️</span>
                      <span className="battle-player">Siz</span>
                    </div>
                    <div className="battle-card-info">
                      <span className="badge badge-primary">{inv.subject}</span>
                      <span className="badge badge-warning">⏳ Chaqiriw</span>
                    </div>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-success" onClick={() => handleAcceptInvite(inv.id)}>✅ Qabul qilish</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleRejectInvite(inv.id)}>✖ Rad etish</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeBattles.length === 0 && invites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚔️</div>
              <h3>Faol janglar yo'q</h3>
              <p>Yangi jang yarating yoki o'quvchilarni chaqiring!</p>
            </div>
          ) : (
            <div className="cards-grid">
              {activeBattles.map(battle => (
                <div key={battle.id} className="edu-card battle-card">
                  <div className="battle-card-vs">
                    <span className="battle-player">{battle.player1_name || battle.player1?.first_name || 'Player 1'}</span>
                    <span className="battle-vs-text">VS</span>
                    <span className="battle-player">{battle.player2_name || battle.player2?.first_name || 'Player 2'}</span>
                  </div>
                  <div className="battle-card-info">
                    <span className="badge badge-primary">{battle.subject || 'Umumiy'}</span>
                    <span className={`badge ${battle.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {battle.status === 'active' ? '🔥 Faol' : '⏳ Kutishda'}
                    </span>
                  </div>
                  {(battle.status === 'active' && (
                    <Link to={`/battles/${battle.id}`} className="btn btn-primary btn-full mt-1">
                      ⚔️ Jangga kirish
                    </Link>
                  )) || (battle.status === 'waiting' && battle.player1 !== user?.id && (
                    <button className="btn btn-primary btn-full mt-1" onClick={() => handleJoin(battle.id)}>
                      ⚔️ Jangga qo'shilish
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'students' && (
        <>
          <div className="edu-card mb-1">
            <div className="form-group">
              <label>Chaqiriw uchun fan</label>
              <select className="edu-input" value={challengeSubject} onChange={e => setChallengeSubject(e.target.value)}>
                <option value="ingliz_tili">Ingliz Tili</option>
                <option value="matematika">Matematika</option>
                <option value="rus_tili">Rus Tili</option>
                <option value="ozbek_tili">O'zbek Tili</option>
                <option value="fizika">Fizika</option>
                <option value="kimyo">Kimyo</option>
                <option value="biologiya">Biologiya</option>
                <option value="tarix">Tarix</option>
              </select>
            </div>
            <p className="text-muted">Onlayn o'quvchilar birinchi bo'lib turadi — jangga chaqirib, g'alaba qozonsangiz 2 coin olasiz!</p>
          </div>
          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>O'quvchilar yo'q</h3>
            </div>
          ) : (
            <div className="cards-grid">
              {students.map(s => (
                <div key={s.id} className={`edu-card student-card ${s.is_online ? 'student-card-online' : ''}`}>
                  <div className="student-card-main">
                    <div className="student-avatar-wrap">
                      <div className="user-cell-avatar">{s.first_name?.[0] || s.username?.[0] || '?'}</div>
                      <span className={`online-dot ${s.is_online ? 'online' : 'offline'}`}></span>
                    </div>
                    <div className="student-card-info">
                      <span className="student-card-name">{s.first_name} {s.last_name}</span>
                      <span className="student-card-meta">
                        {s.is_online ? (
                          <span className="online-label">🟢 Onlayn</span>
                        ) : (
                          <span className="offline-label">⚫ Nofaol</span>
                        )}
                        {s.coin_balance !== undefined && <span className="coin-badge">🪙 {s.coin_balance}</span>}
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm btn-full" onClick={() => handleChallenge(s)}>
                    ⚡ Chaqiriw
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {completedBattles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <h3>Jang tarixi bo'sh</h3>
            </div>
          ) : (
            <div className="table-container">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>Player 1</th>
                    <th>VS</th>
                    <th>Player 2</th>
                    <th>Score</th>
                    <th>G'olib</th>
                    <th>Mukofot</th>
                  </tr>
                </thead>
                <tbody>
                  {completedBattles.map(b => (
                    <tr key={b.id}>
                      <td>{b.player1_name || b.player1?.first_name}</td>
                      <td className="text-center">⚔️</td>
                      <td>{b.player2_name || b.player2?.first_name}</td>
                      <td>{b.player1_score || 0} - {b.player2_score || 0}</td>
                      <td><span className="badge badge-success">{b.winner_name || '—'}</span></td>
                      <td>{b.winner_name ? <span className="coin-badge">🪙 +2</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}