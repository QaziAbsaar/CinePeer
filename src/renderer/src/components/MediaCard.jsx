import { useState, useRef, useEffect } from 'react'
import { Play, Plus, Check, Star } from 'lucide-react'
import { getPosterUrl } from '../services/metadata'
import useMediaStore from '../store/useMediaStore'
import './MediaCard.css'

export default function MediaCard({ item, mediaType = 'movie', badge = null }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const imgRef = useRef(null)

  const { setSelectedMedia, addToWatchlist, removeFromWatchlist, isInWatchlist } = useMediaStore()

  const title = item.title || item.name || 'Untitled'
  const year = (item.release_date || item.first_air_date || '').substring(0, 4)
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const posterUrl = getPosterUrl(item.poster_path, 'medium')
  const inList = isInWatchlist(item.id, mediaType)

  const handleClick = () => {
    setSelectedMedia(item, mediaType)
  }

  const handleWatchlist = (e) => {
    e.stopPropagation()
    if (inList) {
      removeFromWatchlist(item.id, mediaType)
    } else {
      addToWatchlist({
        ...item,
        media_type: mediaType
      })
    }
  }

  return (
    <div
      className={`media-card ${isHovered ? 'media-card-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      id={`media-card-${item.id}`}
    >
      {/* Poster Image */}
      <div className="media-card-poster">
        {!imageLoaded && <div className="media-card-shimmer shimmer" />}
        {posterUrl ? (
          <img
            ref={imgRef}
            src={posterUrl}
            alt={title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`media-card-img ${imageLoaded ? 'loaded' : ''}`}
          />
        ) : (
          <div className="media-card-no-image">
            <Play size={32} />
          </div>
        )}

        {/* Badge */}
        {badge && (
          <span className={`badge badge-${badge.toLowerCase()}`}>
            {badge}
          </span>
        )}

        {/* Hover Overlay */}
        <div className="media-card-overlay">
          <div className="media-card-overlay-actions">
            <button className="btn btn-primary btn-sm" onClick={handleClick}>
              <Play size={16} fill="currentColor" />
              Details
            </button>
            <button
              className={`btn-icon btn-watchlist ${inList ? 'in-list' : ''}`}
              onClick={handleWatchlist}
              title={inList ? 'Remove from list' : 'Add to list'}
            >
              {inList ? <Check size={18} /> : <Plus size={18} />}
            </button>
          </div>

          <div className="media-card-overlay-info">
            <div className="media-card-overlay-title truncate">{title}</div>
            <div className="media-card-overlay-meta">
              {year && <span>{year}</span>}
              {rating && (
                <span className="rating-display">
                  <Star size={12} fill="currentColor" />
                  {rating}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Info (below poster) */}
      <div className="media-card-info">
        <div className="media-card-title truncate">{title}</div>
        <div className="media-card-meta text-meta">
          {year && <span>{year}</span>}
          {rating && (
            <span className="rating-display">
              <Star size={11} fill="currentColor" />
              {rating}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
