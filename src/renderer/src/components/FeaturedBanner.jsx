import { useState, useEffect, useCallback } from 'react'
import { Play, Info, Star, Calendar } from 'lucide-react'
import { getBackdropUrl } from '../services/metadata'
import { GENRES } from '../utils/constants'
import useMediaStore from '../store/useMediaStore'
import './FeaturedBanner.css'

export default function FeaturedBanner({ items = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [loadedBackdrops, setLoadedBackdrops] = useState(new Set())
  const { setSelectedMedia } = useMediaStore()

  // Use items with backdrops if available, otherwise fall back to all items
  const validItems = items.filter(item => item.backdrop_path).length > 0
    ? items.filter(item => item.backdrop_path)
    : items.slice(0, 10)
  const current = validItems[currentIndex]

  // Preload backdrop images for smooth transitions
  useEffect(() => {
    validItems.forEach((item) => {
      const url = item.backdrop_path ? getBackdropUrl(item.backdrop_path, 'original') : null
      if (!url || loadedBackdrops.has(url)) return
      const img = new Image()
      img.onload = () => setLoadedBackdrops((prev) => new Set(prev).add(url))
      img.src = url
    })
  }, [validItems])

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (validItems.length <= 1) return
    const interval = setInterval(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % validItems.length)
        setIsTransitioning(false)
      }, 400)
    }, 8000)
    return () => clearInterval(interval)
  }, [validItems.length])

  const goToSlide = useCallback((index) => {
    if (index === currentIndex) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(index)
      setIsTransitioning(false)
    }, 300)
  }, [currentIndex])

  if (!current) return null

  const title = current.title || current.name || 'Untitled'
  const overview = current.overview || ''
  const rating = current.vote_average?.toFixed(1)
  const year = (current.release_date || current.first_air_date || '').substring(0, 4)
  const mediaType = current.media_type || (current.title ? 'movie' : 'tv')
  // Genre names — handle both TMDB genre_ids and OMDB genre_names
  const genreNames = current.genre_names?.length > 0
    ? current.genre_names.slice(0, 3)
    : (current.genre_ids || []).slice(0, 3).map(id => GENRES[id]).filter(Boolean)

  return (
    <section className="featured-banner" id="featured-banner">
      {/* Background Image (with fallback gradient when no backdrop) */}
      <div
        className={`featured-backdrop ${isTransitioning ? 'fading' : ''}`}
        style={{
          backgroundImage: current.backdrop_path
            ? `url(${getBackdropUrl(current.backdrop_path, 'original')})`
            : 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)'
        }}
      />

      {/* Gradients */}
      <div className="featured-gradient-left" />
      <div className="featured-gradient-bottom" />

      {/* Content */}
      <div className={`featured-content ${isTransitioning ? 'fading' : ''}`}>
        <h1 className="featured-title text-hero">{title}</h1>

        <div className="featured-meta">
          {rating && (
            <span className="badge badge-rating">
              <Star size={12} fill="currentColor" /> {rating}
            </span>
          )}
          {year && (
            <span className="featured-year">
              <Calendar size={14} /> {year}
            </span>
          )}
          {genreNames.map(g => (
            <span key={g} className="genre-pill">{g}</span>
          ))}
        </div>

        <p className="featured-overview truncate-3">{overview}</p>

        <div className="featured-actions">
          <button
            className="btn btn-primary"
            onClick={() => setSelectedMedia(current, mediaType)}
          >
            <Play size={18} fill="currentColor" />
            Play Now
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setSelectedMedia(current, mediaType)}
          >
            <Info size={18} />
            More Info
          </button>
        </div>
      </div>

      {/* Slide Indicators */}
      {validItems.length > 1 && (
        <div className="featured-indicators">
          {validItems.slice(0, 8).map((_, idx) => (
            <button
              key={idx}
              className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
