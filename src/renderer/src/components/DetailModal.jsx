import { useState, useEffect, useCallback } from 'react'
import { X, Star, Clock, Calendar, Play, Plus, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { getDetails, getBackdropUrl, getProfileUrl, getPosterUrl, lookupByExternalId } from '../services/metadata'
import { searchMovieTorrents, searchTvTorrents, searchAnimeTorrents } from '../services/torrentSearch'
import { GENRES, formatDuration, formatBytes } from '../utils/constants'
import useMediaStore from '../store/useMediaStore'
import useTorrentStore from '../store/useTorrentStore'
import { useNavigate } from 'react-router-dom'
import './DetailModal.css'

export default function DetailModal() {
  const { selectedMedia, selectedMediaType, clearSelectedMedia, addToWatchlist, removeFromWatchlist, isInWatchlist } = useMediaStore()
  const { addTorrent } = useTorrentStore()
  const navigate = useNavigate()

  const [details, setDetails] = useState(null)
  const [torrents, setTorrents] = useState([])
  const [loading, setLoading] = useState(false)
  const [torrentLoading, setTorrentLoading] = useState(false)
  const [streamingHash, setStreamingHash] = useState(null)
  const [trailerKey, setTrailerKey] = useState(null)
  const [expandedSeasons, setExpandedSeasons] = useState(new Set())

  // Fetch full details + torrents
  useEffect(() => {
    if (!selectedMedia) {
      setDetails(null)
      setTorrents([])
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setTorrentLoading(true)
      try {
        let detailData = null

        // If item came from YTS (MoviesPage), its ID is a YTS ID, not TMDB —
        // use the IMDb ID to find the correct TMDB entry directly.
        if (selectedMedia.yts_data && selectedMedia.imdb_id) {
          const found = await lookupByExternalId(selectedMedia.imdb_id)
          if (found) {
            detailData = await getDetails(found.id, found.media_type || selectedMediaType)
          }
        } else {
          try {
            detailData = await getDetails(selectedMedia.id, selectedMediaType)
          } catch {
            // ID may be from YTS — try looking up by IMDB ID
            if (selectedMedia.imdb_id) {
              const found = await lookupByExternalId(selectedMedia.imdb_id)
              if (found) {
                detailData = await getDetails(found.id, found.media_type || selectedMediaType)
              }
            }
          }
        }
        setDetails(detailData)
        setLoading(false)

        // Extract trailer from TMDB videos
        const videos = detailData?.videos?.results || []
        const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
          || videos.find(v => v.site === 'YouTube')
        setTrailerKey(trailer?.key || null)

        // Fetch torrents from all sources
        const imdbId = detailData?.external_ids?.imdb_id || detailData?.imdb_id || selectedMedia.imdb_id
        if (selectedMediaType === 'movie') {
          const results = await searchMovieTorrents(imdbId)
          setTorrents(results)
        } else {
          const title = detailData?.title || detailData?.name || selectedMedia.title || selectedMedia.name
          const [eztvResults, nyaaResults] = await Promise.allSettled([
            searchTvTorrents(imdbId),
            searchAnimeTorrents(title)
          ])
          const tvTorrents = eztvResults.status === 'fulfilled' ? eztvResults.value : []
          const animeTorrents = nyaaResults.status === 'fulfilled' ? nyaaResults.value : []
          // Merge both, Nyaa.si results append at end
          setTorrents([...tvTorrents, ...animeTorrents])
        }
      } catch (err) {
        console.error('Failed to fetch details:', err)
      } finally {
        setLoading(false)
        setTorrentLoading(false)
      }
    }

    fetchData()
  }, [selectedMedia, selectedMediaType])

  // Auto-expand latest season when TV torrents load
  useEffect(() => {
    if (selectedMediaType !== 'tv' || torrents.length === 0) return
    const maxSeason = Math.max(...torrents.map(t => t.season || 0))
    if (maxSeason > 0) setExpandedSeasons(new Set([maxSeason]))
  }, [torrents, selectedMediaType])

  // Group TV torrents by season number
  const groupBySeason = useCallback((tList) => {
    const groups = {}
    for (const t of tList) {
      const season = t.season || 0
      if (!groups[season]) groups[season] = []
      groups[season].push(t)
    }
    // Sort seasons descending (latest first), episodes ascending within each
    return Object.entries(groups)
      .map(([season, eps]) => ({
        season: parseInt(season, 10),
        episodes: eps.sort((a, b) => (a.episode || 0) - (b.episode || 0))
      }))
      .sort((a, b) => b.season - a.season)
  }, [])

  const toggleSeason = useCallback((season) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev)
      if (next.has(season)) next.delete(season)
      else next.add(season)
      return next
    })
  }, [])

  // Reset streaming hash when modal opens for a new item
  useEffect(() => {
    if (selectedMedia) setStreamingHash(null)
  }, [selectedMedia])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') clearSelectedMedia()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [clearSelectedMedia])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedMedia) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedMedia])

  const handleStream = useCallback(async (torrent) => {
    const magnetUrl = torrent.magnet_url || torrent.magnetUrl
    if (!magnetUrl) return

    setStreamingHash(torrent.hash || 'loading')
    try {
      // Destroy previous torrent before starting new one, if any
      const { currentStream, removeTorrent } = useTorrentStore.getState()
      if (currentStream?.infoHash) {
        removeTorrent(currentStream.infoHash).catch(() => {})
      }

      const title = details?.title || details?.name || 'Unknown'
      await addTorrent(magnetUrl, title, {
        posterPath: details?.poster_path,
        mediaId: details?.id,
        mediaType: selectedMediaType
      })
      setStreamingHash(null)
      clearSelectedMedia()
      navigate('/player')
    } catch (err) {
      console.error('Failed to start stream:', err)
      setStreamingHash(null)
    }
  }, [details, selectedMediaType, addTorrent, clearSelectedMedia, navigate])

  if (!selectedMedia) return null

  const title = details?.title || details?.name || selectedMedia.title || selectedMedia.name
  const year = (details?.release_date || details?.first_air_date || '').substring(0, 4)
  const rating = (details?.vote_average || selectedMedia.vote_average)?.toFixed(1)
  const runtime = details?.runtime || (details?.episode_run_time?.[0])
  const overview = details?.overview || selectedMedia.overview
  const genres = details?.genres || []
  const cast = details?.credits?.cast?.slice(0, 12) || []
  const inList = isInWatchlist(selectedMedia.id, selectedMediaType)
  const backdropUrl = getBackdropUrl(details?.backdrop_path || selectedMedia.backdrop_path, 'original')
  const posterUrl = getPosterUrl(
    details?.poster_path || selectedMedia.poster_path ||
    selectedMedia.yts_data?.medium_cover_image || selectedMedia.yts_poster,
    'medium'
  )

  return (
    <div className="modal-overlay" onClick={clearSelectedMedia} id="detail-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header with Backdrop */}
        <div className="detail-header" style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}>
          <div className="detail-header-gradient" />

          {/* Poster inside header (same stacking context as title) */}
          <div className="detail-poster-wrapper">
            <img
              src={posterUrl}
              alt={title}
              className="detail-poster"
              loading="lazy"
            />
          </div>

          <button className="detail-close btn-icon" onClick={clearSelectedMedia}>
            <X size={20} />
          </button>
          <div className="detail-header-content">
            <h2 className="detail-title font-display">{title}</h2>
            <div className="detail-meta">
              {rating && rating !== '0.0' && (
                <span className="badge badge-rating">
                  <Star size={12} fill="currentColor" /> {rating}
                </span>
              )}
              {year && <span className="detail-meta-item"><Calendar size={14} /> {year}</span>}
              {runtime && <span className="detail-meta-item"><Clock size={14} /> {formatDuration(runtime)}</span>}
            </div>
            {trailerKey && (
              <button
                className="btn btn-sm btn-secondary detail-trailer-btn"
                onClick={() => window.electron?.system?.openExternal(`https://www.youtube.com/watch?v=${trailerKey}`)}
              >
                <Play size={14} fill="currentColor" /> Trailer
              </button>
            )}
          </div>
        </div>

        {/* Body — now directly under modal-content */}
        <div className="detail-body">
          {/* Actions */}
          <div className="detail-actions">
            <button
              className={`btn ${inList ? 'btn-secondary' : 'btn-primary'}`}
              onClick={() => {
                if (inList) {
                  removeFromWatchlist(selectedMedia.id, selectedMediaType)
                } else {
                  addToWatchlist({ ...selectedMedia, media_type: selectedMediaType })
                }
              }}
            >
              {inList ? <Check size={18} /> : <Plus size={18} />}
              {inList ? 'In My List' : 'Add to List'}
            </button>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="detail-genres">
              {genres.map(g => (
                <span key={g.id} className="genre-pill">{g.name}</span>
              ))}
            </div>
          )}

          {/* Overview */}
          {overview && <p className="detail-overview">{overview}</p>}

          {/* Cast */}
          {cast.length > 0 && (
            <div className="detail-cast-section">
              <h3 className="detail-section-title">Cast</h3>
              <div className="detail-cast-row scroll-row">
                {cast.map(person => (
                  <div key={person.id} className="cast-card">
                    {person.profile_path ? (
                      <img
                        src={getProfileUrl(person.profile_path, 'small')}
                        alt={person.name}
                        className="cast-avatar"
                        loading="lazy"
                      />
                    ) : (
                      <div className="cast-avatar cast-avatar-placeholder">
                        {person.name?.[0] || '?'}
                      </div>
                    )}
                    <span className="cast-name truncate">{person.name}</span>
                    <span className="cast-character truncate text-meta">{person.character}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Torrents */}
          <div className="detail-torrents-section">
            <div className="detail-section-header">
              <h3 className="detail-section-title">
                {selectedMediaType === 'tv' ? 'Episodes' : 'Available Streams'}
              </h3>
              {selectedMediaType === 'tv' && (
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    clearSelectedMedia()
                    navigate('/tv-episodes', {
                      state: {
                        tvId: details?.id || selectedMedia.id,
                        media: selectedMedia,
                        mediaType: 'tv'
                      }
                    })
                  }}
                >
                  Browse All Episodes
                </button>
              )}
            </div>
            {torrentLoading ? (
              <div className="torrent-loading">
                <div className="spinner" />
                <span>Finding sources...</span>
              </div>
            ) : torrents.length > 0 ? (
              selectedMediaType === 'tv' ? (
                // ── TV: grouped by season ─────────────────────
                <div className="tv-seasons">
                  {groupBySeason(torrents).map(({ season, episodes }) => (
                    <div key={season} className={`season-group ${season === 0 ? 'season-unknown' : ''}`}>
                      <button
                        className="season-header"
                        onClick={() => toggleSeason(season)}
                      >
                        {expandedSeasons.has(season) ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                        <span className="season-title">
                          {season > 0 ? `Season ${season}` : 'Other'}
                        </span>
                        <span className="season-count text-meta">{episodes.length} ep.</span>
                      </button>
                      {expandedSeasons.has(season) && (
                        <table className="torrent-table">
                          <thead>
                            <tr>
                              <th>Ep.</th>
                              <th>Quality</th>
                              <th>Source</th>
                              <th>Size</th>
                              <th colSpan={2}>Health</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {episodes.map((torrent, idx) => {
                              const seeds = torrent.seeds || 0
                              const peers = torrent.peers || 0
                              const health = seeds >= 100 ? 'excellent' : seeds >= 30 ? 'good' : seeds >= 5 ? 'okay' : seeds > 0 ? 'low' : 'dead'
                              const healthColors = {
                                excellent: '#00E676',
                                good: '#00D4FF',
                                okay: '#FFD700',
                                low: '#FF9800',
                                dead: '#E94560'
                              }
                              return (
                                <tr key={idx} className={health === 'dead' ? 'torrent-row-dead' : ''}>
                                  <td>
                                    <span className="episode-badge">
                                      S{String(season).padStart(2, '0')}E{String(torrent.episode || 0).padStart(2, '0')}
                                    </span>
                                  </td>
                                  <td>
                                    <span className="badge badge-quality">{torrent.quality || 'Unknown'}</span>
                                  </td>
                                  <td>
                                    {torrent.source && <span className="badge badge-source">{torrent.source.toUpperCase()}</span>}
                                  </td>
                                  <td className="text-meta">{torrent.size || formatBytes(torrent.size_bytes || 0)}</td>
                                  <td>
                                    <span className="seed-count" style={{ color: healthColors[health] }}>
                                      {seeds}
                                    </span>
                                    <span className="text-meta" style={{ marginLeft: 2 }}>/ {peers}</span>
                                  </td>
                                  <td>
                                    <span className="health-dot" style={{ background: healthColors[health] }} />
                                    <span className="health-label text-meta">{health}</span>
                                  </td>
                                  <td>
                                    <button
                                      className={`btn btn-sm ${health === 'dead' ? 'btn-secondary' : 'btn-primary'}`}
                                      onClick={() => handleStream(torrent)}
                                      disabled={streamingHash !== null}
                                      title={health === 'dead' ? 'No seeds available — stream may not start' : ''}
                                    >
                                      {streamingHash === (torrent.hash || `${season}-${idx}`) ? (
                                        <div className="spinner" style={{ width: 14, height: 14 }} />
                                      ) : (
                                        <>
                                          <Play size={14} fill="currentColor" />
                                          {health === 'dead' ? 'Unavailable' : 'Stream'}
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // ── Movie: flat table ──────────────────────────
                <table className="torrent-table">
                  <thead>
                    <tr>
                      <th>Quality</th>
                      <th>Source</th>
                      <th>Size</th>
                      <th colSpan={2}>Health</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {torrents.map((torrent, idx) => {
                      const seeds = torrent.seeds || 0
                      const peers = torrent.peers || 0
                      const health = seeds >= 100 ? 'excellent' : seeds >= 30 ? 'good' : seeds >= 5 ? 'okay' : seeds > 0 ? 'low' : 'dead'
                      const healthColors = {
                        excellent: '#00E676',
                        good: '#00D4FF',
                        okay: '#FFD700',
                        low: '#FF9800',
                        dead: '#E94560'
                      }
                      return (
                      <tr key={idx} className={health === 'dead' ? 'torrent-row-dead' : ''}>
                        <td>
                          <span className="badge badge-quality">{torrent.quality || 'Unknown'}</span>
                        </td>
                        <td className="text-meta">{torrent.size || formatBytes(torrent.size_bytes || 0)}</td>
                        <td>
                          <span className="seed-count" style={{ color: healthColors[health] }}>
                            {seeds}
                          </span>
                          <span className="text-meta" style={{ marginLeft: 2 }}>/ {peers}</span>
                        </td>
                        <td>
                          <span className="health-dot" style={{ background: healthColors[health] }} />
                          <span className="health-label text-meta">{health}</span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${health === 'dead' ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleStream(torrent)}
                            disabled={streamingHash !== null}
                            title={health === 'dead' ? 'No seeds available — stream may not start' : ''}
                          >
                            {streamingHash === (torrent.hash || idx) ? (
                              <div className="spinner" style={{ width: 14, height: 14 }} />
                            ) : (
                              <>
                                <Play size={14} fill="currentColor" />
                                {health === 'dead' ? 'Unavailable' : 'Stream'}
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              )
            ) : (
              <div className="no-torrents">
                <p>No streams available for this title.</p>
                <p className="text-meta">Try checking with a different source or quality.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
