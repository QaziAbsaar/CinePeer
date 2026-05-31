import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import MediaCard from './MediaCard'
import './CategoryRow.css'

export default function CategoryRow({ title, items = [], mediaType = 'movie', badge = null, onSeeMore = null }) {
  const scrollRef = useRef(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setShowLeftArrow(el.scrollLeft > 20)
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 20)
  }

  const scrollBy = (direction) => {
    const el = scrollRef.current
    if (!el) return
    const amount = el.clientWidth * 0.75
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  if (!items || items.length === 0) return null

  return (
    <section className="category-row">
      {/* Header */}
      <div className="category-header">
        <h2 className="category-title text-section-title">{title}</h2>
        {onSeeMore && (
          <button className="category-see-more" onClick={onSeeMore}>
            See more ›
          </button>
        )}
      </div>

      {/* Scrollable Row */}
      <div className="category-scroll-wrapper">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            className="scroll-arrow scroll-arrow-left"
            onClick={() => scrollBy('left')}
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Cards */}
        <div
          className="scroll-row"
          ref={scrollRef}
          onScroll={handleScroll}
        >
          {items.map((item, index) => (
            <MediaCard
              key={item.id || index}
              item={item}
              mediaType={item.media_type || mediaType}
              badge={badge}
            />
          ))}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            className="scroll-arrow scroll-arrow-right"
            onClick={() => scrollBy('right')}
            aria-label="Scroll right"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </section>
  )
}
