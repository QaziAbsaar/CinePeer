import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { listMovies } from '../services/yts'
import { getPosterUrl } from '../services/metadata'
import FilterBar from '../components/FilterBar'
import MediaCard from '../components/MediaCard'
import { SkeletonCard } from '../components/SkeletonLoader'
import useMediaStore from '../store/useMediaStore'
import './MoviesPage.css'

export default function MoviesPage() {
  const [movies, setMovies] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(false)
  const { filters } = useMediaStore()
  const sentinelRef = useRef(null)
  const fetchingRef = useRef(false)

  // Fetch movies based on filters
  const fetchMovies = useCallback(async (pageNum, reset = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    if (reset) { setLoading(true); setError(false) }

    try {
      const params = {
        page: pageNum,
        limit: 20,
        sort_by: filters.sort_by,
        order_by: 'desc'
      }
      if (filters.genre !== 'All') params.genre = filters.genre.toLowerCase()
      if (filters.quality !== 'All') params.quality = filters.quality
      if (filters.year !== 'All') params.year = filters.year
      if (filters.minimum_rating > 0) params.minimum_rating = filters.minimum_rating

      const result = await listMovies(params)
      const newMovies = (result.movies || []).map(m => ({
        id: m.id,
        title: m.title,
        name: m.title,
        poster_path: null,
        backdrop_path: m.large_cover_image ? null : null, // YTS has no backdrop
        imdb_id: m.imdb_code ? `tt${m.imdb_code}` : null,
        yts_poster: m.medium_cover_image,
        vote_average: m.rating,
        release_date: String(m.year),
        overview: m.synopsis || m.summary,
        genre_ids: [],
        media_type: 'movie',
        yts_data: m
      }))

      if (reset) {
        setMovies(newMovies)
      } else {
        setMovies(prev => [...prev, ...newMovies])
      }
      setHasMore(newMovies.length >= 20)
    } catch (err) {
      console.error('Failed to fetch movies:', err)
      setHasMore(false)
      if (reset) setError(true)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [filters])

  // Reset on filter change
  useEffect(() => {
    setPage(1)
    fetchMovies(1, true)
  }, [filters, fetchMovies])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fetchingRef.current) {
          setPage(prev => {
            const nextPage = prev + 1
            fetchMovies(nextPage)
            return nextPage
          })
        }
      },
      { rootMargin: '400px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, fetchMovies])

  return (
    <div className="page-container" id="movies-page">
      <div className="page-content">
        <h1 className="page-title font-display">Movies</h1>
        <FilterBar />

        {loading ? (
          <div className="media-grid">
            {Array.from({ length: 18 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="error-state">
            <p>Failed to load movies. Check your connection.</p>
            <button className="btn btn-primary" onClick={() => fetchMovies(1, true)}>
              <RefreshCw size={18} /> Retry
            </button>
          </div>
        ) : movies.length === 0 ? (
          <div className="empty-state">
            <p>No movies found with these filters.</p>
            <p className="text-meta">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="media-grid">
            {movies.map((movie, idx) => (
              <YTSMovieCard key={`${movie.id}-${idx}`} movie={movie} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="scroll-sentinel" />}
      </div>
    </div>
  )
}

// Special card for YTS movies (uses YTS poster instead of TMDB)
function YTSMovieCard({ movie }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { setSelectedMedia, addToWatchlist, removeFromWatchlist, isInWatchlist } = useMediaStore()
  const [isHovered, setIsHovered] = useState(false)

  const inList = isInWatchlist(movie.id, 'movie')

  return (
    <div
      className={`media-card ${isHovered ? 'media-card-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setSelectedMedia(movie, 'movie')}
      role="button"
      tabIndex={0}
    >
      <div className="media-card-poster">
        {!imageLoaded && <div className="media-card-shimmer shimmer" />}
        {movie.yts_poster ? (
          <img
            src={movie.yts_poster}
            alt={movie.title}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`media-card-img ${imageLoaded ? 'loaded' : ''}`}
          />
        ) : (
          <div className="media-card-no-image">🎬</div>
        )}

        <div className="media-card-overlay">
          <div className="media-card-overlay-info">
            <div className="media-card-overlay-title truncate">{movie.title}</div>
            <div className="media-card-overlay-meta">
              <span>{movie.release_date}</span>
              {movie.vote_average > 0 && (
                <span className="rating-display">★ {movie.vote_average}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="media-card-info">
        <div className="media-card-title truncate">{movie.title}</div>
        <div className="media-card-meta text-meta">
          <span>{movie.release_date}</span>
          {movie.vote_average > 0 && (
            <span className="rating-display">★ {movie.vote_average}</span>
          )}
        </div>
      </div>
    </div>
  )
}
