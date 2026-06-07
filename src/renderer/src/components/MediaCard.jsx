import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Plus, Check, Star, Clock } from 'lucide-react'
import { getPosterUrl } from '../services/metadata'
import { GENRES, formatDuration } from '../utils/constants'
import useMediaStore from '../store/useMediaStore'
import './MediaCard.css'

export default function MediaCard({ item, mediaType = 'movie', badge = null }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const hoverTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const imgRef = useRef(null)
  const cardRef = useRef(null)

  const { setSelectedMedia, addToWatchlist, removeFromWatchlist, isInWatchlist } = useMediaStore()

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    hoverTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setIsExpanded(true)
    }, 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setIsExpanded(false)
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    setSelectedMedia(item, mediaType)
  }, [item, mediaType, setSelectedMedia])

  const handleWatchlist = useCallback((e) => {
    e.stopPropagation()
    if (inList) {
      removeFromWatchlist(item.id, mediaType)
    } else {
      addToWatchlist({ ...item, media_type: mediaType })
    }
  }, [item, mediaType, inList, addToWatchlist, removeFromWatchlist])

  const title = item.title || item.name || 'Untitled'
  const year = (item.release_date || item.first_air_date || '').substring(0, 4)
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null
  const runtime = item.runtime
  const posterUrl = getPosterUrl(item.poster_path, 'medium')
  const inList = isInWatchlist(item.id, mediaType)
  const genreNames = item.genre_names?.length > 0
    ? item.genre_names.slice(0, 3)
    : (item.genre_ids || []).slice(0, 3).map(id => GENRES[id]).filter(Boolean)
  const overview = item.overview || ''

  return (
    <div
      ref={cardRef}
      className={`media-card ${isHovered ? 'media-card-hovered' : ''} ${isExpanded ? 'media-card-expanded' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      id={`media-card-${item.id}`}
    >
      {/* Poster */}
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

        {/* Expanded Overlay — revealed after 300ms */}
        <div className="media-card-overlay">
          <div className="media-card-overlay-bg" />

          {/* Main action button */}
          <button className="media-card-play-btn" onClick={handleClick}>
            <Play size={22} fill="currentColor" />
          </button>

          <div className="media-card-overlay-info">
            <div className="media-card-overlay-title truncate">{title}</div>
            <div className="media-card-overlay-meta">
              {rating && (
                <span className="rating-display">
                  <Star size={11} fill="currentColor" /> {rating}
                </span>
              )}
              {year && <span>{year}</span>}
              {runtime && <span><Clock size={11} /> {formatDuration(runtime)}</span>}
            </div>

            {/* Extra details revealed on expand */}
            <div className="media-card-expanded-details">
              {genreNames.length > 0 && (
                <div className="media-card-genres">
                  {genreNames.map(g => <span key={g} className="genre-pill-sm">{g}</span>)}
                </div>
              )}
              {overview && <p className="media-card-overview truncate-2">{overview}</p>}
            </div>
          </div>

          <div className="media-card-overlay-actions">
            <button
              className={`btn-icon btn-watchlist ${inList ? 'in-list' : ''}`}
              onClick={handleWatchlist}
              title={inList ? 'Remove from list' : 'Add to list'}
            >
              {inList ? <Check size={16} /> : <Plus size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Info Below Poster */}
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
