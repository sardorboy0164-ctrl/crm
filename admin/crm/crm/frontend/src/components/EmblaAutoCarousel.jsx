import { useCallback, useEffect, useState, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import AutoScroll from 'embla-carousel-auto-scroll'

const DEFAULT_SPEED_PER_SLIDE = 2600

export default function EmblaAutoCarousel({
  items = [],
  renderItem,
  slideWidth = '50%',
  autoScroll = true,
  speed = 1,
  direction = 'forward',
  loop = true,
  className = '',
  title,
  subtitle,
  emptyMessage = "Elementlar topilmadi",
  emptyIcon = "📭",
}) {
  const [isPlaying, setIsPlaying] = useState(autoScroll)
  const timerRef = useRef(null)

  const options = {
    align: 'start',
    loop,
    containScroll: false,
    dragFree: true,
  }

  const [emblaRef, emblaApi] = useEmblaCarousel(
    options,
    autoScroll
      ? [
          AutoScroll({
            playOnInit: autoScroll,
            speed: DEFAULT_SPEED_PER_SLIDE / speed,
            stopOnInteraction: false,
            stopOnMouseEnter: false,
            direction,
          }),
        ]
      : []
  )

  const stopAutoScroll = useCallback(() => {
    const plugin = emblaApi?.plugins()?.autoScroll
    if (plugin && plugin.isPlaying()) {
      plugin.stop()
      setIsPlaying(false)
    }
  }, [emblaApi])

  const playAutoScroll = useCallback(() => {
    const plugin = emblaApi?.plugins()?.autoScroll
    if (plugin && !plugin.isPlaying()) {
      plugin.play()
      setIsPlaying(true)
    }
  }, [emblaApi])

  const handleMouseEnter = useCallback(() => {
    stopAutoScroll()
  }, [stopAutoScroll])

  const handleMouseLeave = useCallback(() => {
    if (autoScroll) playAutoScroll()
  }, [autoScroll, playAutoScroll])

  const handleTouchStart = useCallback(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(stopAutoScroll, 250)
  }, [stopAutoScroll])

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (autoScroll) playAutoScroll()
  }, [autoScroll, playAutoScroll])

  useEffect(() => {
    if (!emblaApi) return
    const plugin = emblaApi.plugins()?.autoScroll
    if (plugin) {
      setIsPlaying(plugin.isPlaying())
      emblaApi
        .on('autoScroll:play', () => setIsPlaying(true))
        .on('autoScroll:stop', () => setIsPlaying(false))
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [emblaApi])

  const togglePlay = useCallback(() => {
    if (isPlaying) stopAutoScroll()
    else playAutoScroll()
  }, [isPlaying, stopAutoScroll, playAutoScroll])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const canScrollPrev = !!emblaApi?.canScrollPrev()
  const canScrollNext = !!emblaApi?.canScrollNext()

  if (!items || items.length === 0) {
    return (
      <div className="embla-section">
        {title && (
          <div className="embla-section-header">
            <div>
              <h2 className="embla-section-title glow-text">{title}</h2>
              {subtitle && <p className="embla-section-subtitle">{subtitle}</p>}
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
    <div className={`embla-section ${className}`}>
      {title && (
        <div className="embla-section-header">
          <div>
            <h2 className="embla-section-title glow-text">{title}</h2>
            {subtitle && <p className="embla-section-subtitle">{subtitle}</p>}
          </div>
          <div className="embla-section-controls">
            {autoScroll && (
              <button
                className={`embla-play-toggle ${isPlaying ? 'active' : ''}`}
                onClick={togglePlay}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            )}
            <button
              className="embla-nav-btn"
              onClick={scrollPrev}
              disabled={!canScrollPrev && !loop}
            >
              ‹
            </button>
            <button
              className="embla-nav-btn"
              onClick={scrollNext}
              disabled={!canScrollNext && !loop}
            >
              ›
            </button>
          </div>
        </div>
      )}

      <div
        className="embla-viewport embla-mask"
        ref={emblaRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="embla-container" style={{ '--slide-width': slideWidth }}>
          {items.map((item, index) => (
            <div className="embla-slide" style={{ '--i': index }} key={item.id ?? index}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
