import { useState, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

export default function SwiperCarousel({
  items = [],
  renderItem,
  slidesPerView = 3,
  spaceBetween = 16,
  autoScroll = true,
  speed = 1,
  direction = 'forward',
  loop = true,
  gallery = false,
  className = '',
  title,
  subtitle,
  emptyMessage = "Elementlar topilmadi",
  emptyIcon = "📭"
}) {
  const [isPlaying, setIsPlaying] = useState(autoScroll)
  const swiperRef = useRef(null)

  const handleMouseEnter = () => {
    if (swiperRef.current && isPlaying) {
      swiperRef.current.autoplay.stop()
    }
  }

  const handleMouseLeave = () => {
    if (swiperRef.current && isPlaying) {
      swiperRef.current.autoplay.start()
    }
  }

  const toggleAutoScroll = () => {
    if (swiperRef.current) {
      if (isPlaying) {
        swiperRef.current.autoplay.stop()
      } else {
        swiperRef.current.autoplay.start()
      }
      setIsPlaying(!isPlaying)
    }
  }

  if (items.length === 0) {
    return (
      <div className="swiper-section">
        {title && (
          <div className="swiper-section-header">
            <div>
              <h2 className="swiper-section-title glow-text">{title}</h2>
              {subtitle && <p className="swiper-section-subtitle">{subtitle}</p>}
            </div>
          </div>
        )}
        <div className="empty-state">
          <div className="empty-icon">{emptyIcon}</div>
          <h3>{emptyMessage}</h3>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`swiper-section ${gallery ? 'swiper-gallery-mode' : ''} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {title && (
        <div className="swiper-section-header">
          <div>
            <h2 className="swiper-section-title glow-text">{title}</h2>
            {subtitle && <p className="swiper-section-subtitle">{subtitle}</p>}
          </div>
          {autoScroll && (
            <button
              className={`btn btn-sm swiper-autoscroll-toggle ${isPlaying ? 'active' : ''}`}
              onClick={toggleAutoScroll}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
          )}
        </div>
      )}

      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={gallery ? 12 : spaceBetween}
        slidesPerView={slidesPerView}
        navigation
        pagination={gallery ? false : { clickable: true }}
        loop={loop && items.length > slidesPerView}
        autoplay={
          autoScroll && isPlaying
            ? {
                delay: 0,
                speed: speed,
                disableOnInteraction: false,
                pauseOnMouseEnter: false,
                reverseDirection: direction === 'backward',
              }
            : false
        }
        freeMode={gallery ? { enabled: true, momentum: true, momentumRatio: 0.25, momentumVelocityRatio: 0.25 } : false}
        breakpoints={
          gallery
            ? {
                0: { slidesPerView: 2, spaceBetween: 8 },
                480: { slidesPerView: 3, spaceBetween: 10 },
                768: { slidesPerView: 4, spaceBetween: 12 },
                1024: { slidesPerView: 5, spaceBetween: 12 },
                1280: { slidesPerView: slidesPerView, spaceBetween: 14 },
              }
            : {
                0: { slidesPerView: 1 },
                480: { slidesPerView: Math.min(slidesPerView, 2) },
                768: { slidesPerView: Math.min(slidesPerView, 2) },
                1024: { slidesPerView: slidesPerView },
              }
        }
        onSwiper={(swiper) => {
          swiperRef.current = swiper
        }}
        className="edu-swiper"
      >
        {items.map((item, index) => (
          <SwiperSlide key={item.id || index} className={gallery ? 'gallery-slide' : ''}>
            {renderItem(item, index)}
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  )
}
