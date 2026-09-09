import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const BATTLE_TIME = 15

export default function BattleArena() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [battle, setBattle] = useState(null)
  const [myAnswered, setMyAnswered] = useState({})
  const [currentQ, setCurrentQ] = useState(null)
  const [myScore, setMyScore] = useState(0)
  const [oppScore, setOppScore] = useState(0)
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [timeLeft, setTimeLeft] = useState(BATTLE_TIME)
  const [finished, setFinished] = useState(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const loadBattle = async () => {
    try {
      const res = await api.get(`/battle/battles/${id}/`)
      const b = res.data
      setBattle(b)
      const player1 = b.player1_id === user.id || b.player1 === user.id
      setMyScore(player1 ? (b.player1_score || 0) : (b.player2_score || 0))
      setOppScore(player1 ? (b.player2_score || 0) : (b.player1_score || 0))
      if (b.status === 'finished') {
        setFinished({ winner_id: b.winner_id || b.winner, coins_earned: 0 })
      }
      if (b.status !== 'waiting') {
        const answeredSet = {}
        ;(b.answers || []).forEach(a => {
          if (a.player === user.id) answeredSet[a.question] = true
        })
        setMyAnswered(answeredSet)
        const next = (b.questions || []).find(q => !answeredSet[q.id])
        setCurrentQ(next || null)
      }
    } catch (err) {
      console.error(err)
      setError('Jangni yuklashda xatolik')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBattle()
  }, [id])

  useEffect(() => {
    if (!battle || battle.status !== 'waiting') return
    const interval = setInterval(loadBattle, 3000)
    return () => clearInterval(interval)
  }, [battle])

  useEffect(() => {
    if (!currentQ || feedback || finished) return
    setTimeLeft(BATTLE_TIME)
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleAnswer(1) // vaqt tugagach tasodifiy javob sifatida yuboriladi
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [currentQ, feedback, finished])

  const joinBattle = async () => {
    setJoining(true)
    try {
      await api.post(`/battle/battles/${id}/join/`)
      await loadBattle()
    } catch (err) {
      alert('Jangga qo\'shilishda xatolik: ' + (err.response?.data?.error || err.message))
    } finally {
      setJoining(false)
    }
  }

  const handleAnswer = async (optionIdx) => {
    if (!currentQ || selected != null) return
    setSelected(optionIdx)
    try {
      const res = await api.post(`/battle/battles/${id}/answer_battle/`, {
        question_id: currentQ.id,
        answer: optionIdx + 1,
      })
      const d = res.data
      const myIsPlayer1 = battle.player1 === user.id || battle.player1_id === user.id
      setMyScore(myIsPlayer1 ? d.player1_score || 0 : d.player2_score || 0)
      setOppScore(myIsPlayer1 ? d.player2_score || 0 : d.player1_score || 0)
      setFeedback({
        correct: d.is_correct,
        correctAnswer: d.correct_answer,
      })
      setMyAnswered(prev => ({ ...prev, [currentQ.id]: true }))
      if (d.battle_finished) {
        setTimeout(() => {
          setFinished({
            winner_id: d.winner_id,
            coins_earned: d.coins_earned || 0,
            p1: d.player1_score,
            p2: d.player2_score,
          })
        }, 1200)
      } else {
        setTimeout(() => {
          const next = (battle.questions || []).find(q => q.id !== currentQ.id && !myAnswered[q.id])
          setCurrentQ(next || null)
          setSelected(null)
          setFeedback(null)
        }, 1200)
      }
    } catch (err) {
      console.error(err)
      setSelected(null)
      alert('Javob yuborishda xatolik: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Jang yuklanmoqda...</p>
      </div>
    )
  }

  if (error || !battle) {
    return (
      <div className="page-error">
        <span className="error-icon">⚠️</span>
        <p>{error || 'Jang topilmadi'}</p>
        <button className="btn btn-primary" onClick={() => navigate('/battles')}>⚔️ Janglar</button>
      </div>
    )
  }

  const isPlayer = battle.player1 === user.id || battle.player1_id === user.id ||
                   battle.player2 === user.id || battle.player2_id === user.id
  const player1 = battle.player1 === user.id || battle.player1_id === user.id

  if (finished) {
    const won = finished.winner_id === user.id
    const draw = !won && finished.winner_id == null
    const fscore1 = finished.p1 ?? battle.player1_score ?? 0
    const fscore2 = finished.p2 ?? battle.player2_score ?? 0
    return (
      <div className="page">
        <div className="battle-result">
          <div className={`result-card ${won ? 'result-pass' : 'result-fail'}`}>
            <div className="battle-result-effect">
              {won ? '🏆' : draw ? '🤝' : '💀'}
            </div>
            <h1 className="glow-text battle-result-title">
              {won ? 'G\'ALABA!' : draw ? 'DURANG!' : "MAG'LUBIYAT"}
            </h1>
            <div className="battle-final-score">
              <div className="battle-score-side">
                <span className="score-big">{player1 ? fscore1 : fscore2}</span>
                <span className="score-label">Siz</span>
              </div>
              <span className="score-divider">—</span>
              <div className="battle-score-side">
                <span className="score-big">{player1 ? fscore2 : fscore1}</span>
                <span className="score-label">Raqib</span>
              </div>
            </div>
            {won && finished.coins_earned > 0 && (
              <p className="result-coins">🪙 +{finished.coins_earned} coin olindingiz!</p>
            )}
            <div className="result-actions">
              <button className="btn btn-primary" onClick={() => navigate('/battles')}>⚔️ Janglar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!isPlayer) {
    return (
      <div className="page">
        <div className="battle-arena-header">
          <div className="battle-arena-players">
            <div className="battle-arena-player">
              <div className="avatar-large">👤</div>
              <span className="player-name">{battle.player1_name || 'Player 1'}</span>
              <span className="player-score glow-text">{battle.player1_score || 0}</span>
            </div>
            <div className="battle-arena-vs"><span className="vs-text glow-text">VS</span></div>
            <div className="battle-arena-player">
              <div className="avatar-large">👤</div>
              <span className="player-name">{battle.player2_name || 'Player 2'}</span>
              <span className="player-score glow-text">{battle.player2_score || 0}</span>
            </div>
          </div>
        </div>
        {battle.status === 'waiting' ? (
          <div className="battle-waiting">
            <p className="mb-1">⚔️ {battle.player1_name || 'Player 1'} sizni jangga chaqirmoqda</p>
            <button className="btn btn-primary" onClick={joinBattle} disabled={joining}>
              {joining ? 'Qo\'shilmoqda...' : '⚔️ Jangga qo\'shilish'}
            </button>
          </div>
        ) : (
          <div className="battle-waiting">
            <p>Siz bu jangda ishtirok etmaysiz</p>
            <button className="btn btn-secondary" onClick={() => navigate('/battles')}>⚔️ Janglar</button>
          </div>
        )}
      </div>
    )
  }

  if (battle.status === 'waiting') {
    return (
      <div className="page">
        <div className="battle-waiting">
          <div className="loading-spinner"></div>
          <p>⏳ Raqib kutilmoqda...</p>
          <p className="text-muted">Jang tugmasi: {battle.subject_display || battle.subject}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/battles')}>⚔️ Janglar</button>
        </div>
      </div>
    )
  }

  const options = currentQ
    ? [currentQ.choice1, currentQ.choice2, currentQ.choice3, currentQ.choice4]
    : []

  return (
    <div className="page battle-arena-page">
      <div className="battle-arena-header">
        <div className="battle-arena-players">
          <div className="battle-arena-player">
            <div className="avatar-large">{user?.first_name?.[0] || 'S'}</div>
            <span className="player-name">Siz {battle.subject_display ? `(${battle.subject_display})` : ''}</span>
            <span className="player-score glow-text">{myScore}</span>
          </div>
          <div className="battle-arena-vs"><span className="vs-text glow-text">VS</span></div>
          <div className="battle-arena-player">
            <div className="avatar-large">👤</div>
            <span className="player-name">{player1 ? (battle.player2_name || 'Raqib') : (battle.player1_name || 'Raqib')}</span>
            <span className="player-score glow-text">{oppScore}</span>
          </div>
          <div className="battle-scores-label">
            <div><span>Mening savollarim:</span> <strong>{Object.keys(myAnswered).length}/{battle.questions?.length || 0}</strong></div>
          </div>
        </div>
      </div>

      {currentQ ? (
        <>
          <div className="battle-timer-bar">
            <div className="battle-timer-fill" style={{ width: `${(timeLeft / BATTLE_TIME) * 100}%` }}></div>
          </div>
          <div className={`battle-timer-text ${timeLeft < 5 ? 'timer-warning' : ''}`}>
            ⏱️ {timeLeft}s
          </div>

          <div className="battle-question">
            <h2 className="battle-question-text">{currentQ.question_text}</h2>
          </div>

          <div className="battle-options">
            {options.map((opt, idx) => (
              <button
                key={idx}
                className={`battle-option ${feedback ? (idx + 1 === feedback.correctAnswer ? 'correct' : (selected === idx ? 'wrong' : '')) : ''} ${selected === idx ? 'selected' : ''}`}
                onClick={() => handleAnswer(idx)}
                disabled={selected != null || !opt}
              >
                <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                <span className="option-text">{opt || '—'}</span>
              </button>
            ))}
          </div>

          {feedback && (
            <p className={`pt-1 ${feedback.correct ? 'feedback-correct' : 'feedback-wrong'}`}>
              {feedback.correct ? '✅ To\'g\'ri javob!' : `❌ Xato! To\'g\'ri javob: ${String.fromCharCode(64 + feedback.correctAnswer)}`}
            </p>
          )}
        </>
      ) : (
        <div className="battle-waiting">
          {battle.status === 'finished' ? (
            <p>Jang yakunlandi!</p>
          ) : (
            <>
              <div className="loading-spinner"></div>
              <p>⏳ Raqib javoblari kutilmoqda...</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}