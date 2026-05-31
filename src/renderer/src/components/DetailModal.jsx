import { useState, useEffect, useCallback } from 'react'
import { X, Star, Clock, Calendar, Play, Plus, Check, ExternalLink } from 'lucide-react'
import { getDetails, getBackdropUrl, getProfileUrl, lookupByExternalId } from '../services/tmdb'
import { searchByImdbId } from '../services/yts'
import { getTorrents } from '../services/eztv'
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
        // Fetch TMDB details — fall back to IMDB lookup if YTS id was used
        let detailData = null
        try {
          detailData = await getDetails(selectedMedia.id, selectedMediaType)
        } catch {
          // ID may be from YTS — try looking up by IMDB ID
          if (selectedMedia.imdb_id) {
            detailData = await lookupByExternalId(selectedMedia.imdb_id)
            detailData = detailData
              ? await getDetails(detailData.id, detailData.media_type || selectedMediaType)
              : null
          }
        }
        setDetails(detailData)
        setLoading(false)

        // Fetch torrents
        const imdbId = detailData.external_ids?.imdb_id || detailData.imdb_id
        if (imdbId) {
          if (selectedMediaType === 'movie') {
            const ytsMovie = await searchByImdbId(imdbId)
            setTorrents(ytsMovie?.torrents || [])
          } else {
            const result = await getTorrents({ imdbId })
            setTorrents(result.torrents || [])
          }
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
      const title = details?.title || details?.name || 'Unknown'
      await addTorrent(magnetUrl, title, {
        posterPath: details?.poster_path,
        mediaId: details?.id,
        mediaType: selectedMediaType
      })
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

  return (
    <div className="modal-overlay" onClick={clearSelectedMedia} id="detail-modal">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header with Backdrop */}
        <div className="detail-header" style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}>
          <div className="detail-header-gradient" />
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
          </div>
        </div>

        {/* Body */}
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
            <h3 className="detail-section-title">Available Streams</h3>
            {torrentLoading ? (
              <div className="torrent-loading">
                <div className="spinner" />
                <span>Finding sources...</span>
              </div>
            ) : torrents.length > 0 ? (
              <table className="torrent-table">
                <thead>
                  <tr>
                    <th>Quality</th>
                    {selectedMediaType === 'tv' && <th>Episode</th>}
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
                      {selectedMediaType === 'tv' && (
                        <td>S{String(torrent.season || 0).padStart(2, '0')}E{String(torrent.episode || 0).padStart(2, '0')}</td>
                      )}
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
