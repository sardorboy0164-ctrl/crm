import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-title glow-text">404</h1>
        <p className="not-found-text">Sahifa topilmadi!</p>
        <p className="not-found-subtext">Siz qidirgan sahifa mavjud emas yoki ko'chirilgan.</p>
        <Link to="/dashboard" className="btn btn-primary btn-lg mt-2">
          🏠 Bosh sahifaga qaytish
        </Link>
      </div>
    </div>
  )
}
