import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api'

export default function CoinShop() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState('shop')

  useEffect(() => {
    fetchShop()
    fetchPurchases()
  }, [])

  const fetchShop = async () => {
    try {
      const res = await api.get('/coin/shop-items/')
      setItems(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPurchases = async () => {
    try {
      const res = await api.get('/coin/purchases/')
      setPurchases(res.data?.results || res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleBuy = async (itemId) => {
    setBuying(itemId)
    setMessage('')
    try {
      await api.post(`/coin/shop-items/${itemId}/buy_item/`)
      setMessage('✅ Xarid muvaffaqiyatli!')
      fetchShop()
      fetchPurchases()
    } catch (err) {
      setMessage('⚠️ ' + (err.response?.data?.detail || 'Xarid xatosi'))
    } finally {
      setBuying(null)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
        <p>Do'kon yuklanmoqda...</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title glow-text">🛒 Coin Do'kon</h1>
        <p className="page-subtitle">Coinlaringizni sarflang!</p>
      </div>

      <div className="coin-balance-card">
        <div className="coin-balance-icon">🪙</div>
        <div className="coin-balance-info">
          <span className="coin-balance-number glow-text">{user?.coin_balance || 0}</span>
          <span className="coin-balance-label">Sizning coinlaringiz</span>
        </div>
        <div className="coin-sparkles">
          <span className="sparkle">✨</span>
          <span className="sparkle">✨</span>
          <span className="sparkle">✨</span>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>🛒 Do'kon</button>
        <button className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`} onClick={() => setActiveTab('purchases')}>📜 Xaridlar</button>
      </div>

      {message && <div className={message.startsWith('✅') ? 'auth-success' : 'auth-error'}>{message}</div>}

      {activeTab === 'shop' && (
        <>
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛒</div>
              <h3>Do'konda hozircha mahsulotlar yo'q</h3>
            </div>
          ) : (
            <div className="cards-grid">
              {items.map(item => (
                <div key={item.id} className="edu-card shop-item-card">
                  <div className="shop-item-icon">{item.icon || '🎁'}</div>
                  <h3 className="shop-item-name">{item.name}</h3>
                  <p className="shop-item-desc">{item.description || ''}</p>
                  <div className="shop-item-price">
                    <span className="coin-price">🪙 {item.price}</span>
                  </div>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => handleBuy(item.id)}
                    disabled={buying === item.id || (user?.coin_balance || 0) < item.price}
                  >
                    {buying === item.id ? 'Xarid qilinmoqda...' :
                     (user?.coin_balance || 0) < item.price ? 'Yetarli emas' :
                     '🛒 Xarid qilish'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'purchases' && (
        <>
          {purchases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <h3>Siz hali hech narsa xarid qilmagansiz</h3>
            </div>
          ) : (
            <div className="table-container">
              <table className="edu-table">
                <thead>
                  <tr>
                    <th>Mahsulot</th>
                    <th>Narx</th>
                    <th>Sana</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p, idx) => (
                    <tr key={p.id || idx}>
                      <td>{p.item_name || p.item?.name || '—'}</td>
                      <td><span className="coin-badge">🪙 {p.coins_spent || 0}</span></td>
                      <td>{p.purchased_at ? new Date(p.purchased_at).toLocaleDateString() : '—'}</td>
                      <td><span className="badge badge-success">✅ Yakunlangan</span></td>
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
