import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, ChevronDown, ChevronRight, Clock, Star, Calendar } from 'lucide-react'
import { getDetails, getSeasonEpisodes, getPosterUrl, getBackdropUrl } from '../services/metadata'
import { searchTvTorrents, searchAnimeTorrents } from '../services/torrentSearch'
import { formatDuration } from '../utils/constants'
import useTorrentStore from '../store/useTorrentStore'
import './TVEpisodesPage.css'

export default function TVEpisodesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { addTorrent } = useTorrentStore()

  const tvId = location.state?.tvId
  const initialMedia = location.state?.media
  const mediaType = location.state?.mediaType || 'tv'

  const [details, setDetails] = useState(null)
  const [seasons, setSeasons] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [episodes, setEpisodes] = useState([])
  const [torrents, setTorrents] = useState([])
  const [torrentsLoading, setTorrentsLoading] = useState(true)
  const [streamingHash, setStreamingHash] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch TV details + seasons + torrents on mount
  useEffect(() => {
    if (!tvId) return

    const fetchAll = async () => {
      setLoading(true)
      try {
        const data = await getDetails(tvId, 'tv')
        setDetails(data)
        // Filter out season 0 (specials) and empty seasons
        const validSeasons = (data.seasons || [])
          .filter(s => s.season_number > 0 && s.episode_count > 0)
          .sort((a, b) => b.season_number - a.season_number)
        setSeasons(validSeasons)
        if (validSeasons.length > 0) {
          setSelectedSeason(validSeasons[0].season_number)
        }
      } catch (e) {
        console.error('Failed to fetch TV details:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [tvId])

  // Fetch episodes when season changes
  useEffect(() => {
    if (!tvId || !selectedSeason) return

    const fetchEpisodes = async () => {
      try {
        const data = await getSeasonEpisodes(tvId, selectedSeason)
        setEpisodes(data?.episodes || [])
      } catch (e) {
        console.error('Failed to fetch episodes:', e)
        setEpisodes([])
      }
    }

    fetchEpisodes()
  }, [tvId, selectedSeason])

  // Fetch all torrents once
  useEffect(() => {
    if (!details) return

    const fetchTorrents = async () => {
      setTorrentsLoading(true)
      try {
        const imdbId = details?.external_ids?.imdb_id || details?.imdb_id
        const title = details?.name || details?.title || ''
        const [tvRes, nyaaRes] = await Promise.allSettled([
          imdbId ? searchTvTorrents(imdbId) : Promise.resolve([]),
          title ? searchAnimeTorrents(title) : Promise.resolve([])
        ])
        const tvTorrents = tvRes.status === 'fulfilled' ? tvRes.value : []
        const animeTorrents = nyaaRes.status === 'fulfilled' ? nyaaRes.value : []
        setTorrents([...tvTorrents, ...animeTorrents])
      } catch (e) {
        console.error('Failed to fetch torrents:', e)
      } finally {
        setTorrentsLoading(false)
      }
    }

    fetchTorrents()
  }, [details])

  const handleStream = useCallback(async (torrent) => {
    const magnetUrl = torrent.magnet_url || torrent.magnetUrl
    if (!magnetUrl) return

    setStreamingHash(torrent.hash || 'loading')
    try {
      // Destroy previous torrent before starting new one
      const { currentStream, removeTorrent } = useTorrentStore.getState()
      if (currentStream?.infoHash) {
        removeTorrent(currentStream.infoHash).catch(() => {})
      }

      const title = details?.name || details?.title || 'Unknown'
      await addTorrent(magnetUrl, title, {
        posterPath: details?.poster_path,
        mediaId: details?.id,
        mediaType: 'tv'
      })
      setStreamingHash(null)
      navigate('/player')
    } catch (err) {
      console.error('Failed to start stream:', err)
      setStreamingHash(null)
    }
  }, [details, addTorrent, navigate])

  // Filter torrents for a specific episode
  const getTorrentsForEpisode = useCallback((seasonNum, episodeNum) => {
    return torrents.filter(t =>
      (t.season === seasonNum || t.season === 0) &&
      (t.episode === episodeNum || !t.episode)
    )
  }, [torrents])

  // Group torrents by episode for display
  const getEpisodesWithTorrents = useCallback(() => {
    return episodes.map(ep => ({
      ...ep,
      availableTorrents: torrents.filter(t =>
        (t.season === selectedSeason || t.season === 0) &&
        (t.episode === ep.episode_number || !t.episode)
      )
    }))
  }, [episodes, torrents, selectedSeason])

  if (!tvId) {
    return (
      <div className="episodes-page-empty">
        <p>No TV show selected</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Go Back
        </button>
      </div>
    )
  }

  const title = details?.name || details?.title || initialMedia?.title || initialMedia?.name || 'TV Show'
  const year = (details?.first_air_date || '').substring(0, 4)
  const rating = details?.vote_average?.toFixed(1)
  const runtime = details?.episode_run_time?.[0]
  const backdropUrl = getBackdropUrl(details?.backdrop_path, 'original')
  const posterUrl = getPosterUrl(details?.poster_path || initialMedia?.poster_path, 'small')

  const episodesWithTorrents = getEpisodesWithTorrents()

  return (
    <div className="episodes-page">
      {/* Header with backdrop */}
      <div className="episodes-header" style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }}>
        <div className="episodes-header-gradient" />

        <button className="episodes-back btn-icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>

        <div className="episodes-header-content">
          {posterUrl && (
            <img src={posterUrl} alt={title} className="episodes-poster" />
          )}
          <div className="episodes-header-info">
            <h1 className="episodes-title font-display">{title}</h1>
            <div className="episodes-meta">
              {rating && rating !== '0.0' && (
                <span className="badge badge-rating">
                  <Star size={12} fill="currentColor" /> {rating}
                </span>
              )}
              {year && <span className="episodes-meta-item"><Calendar size={14} /> {year}</span>}
              {runtime && <span className="episodes-meta-item"><Clock size={14} /> {formatDuration(runtime)}</span>}
              <span className="episodes-meta-item">{torrents.length} torrents</span>
            </div>
            {details?.overview && <p className="episodes-overview">{details.overview}</p>}
          </div>
        </div>
      </div>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div className="episodes-season-bar">
          <label className="episodes-season-label">Season</label>
          <select
            className="episodes-season-select"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(parseInt(e.target.value, 10))}
          >
            {seasons.map(s => (
              <option key={s.season_number} value={s.season_number}>
                Season {s.season_number} ({s.episode_count} ep.)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Episodes list */}
      <div className="episodes-list">
        {loading ? (
          <div className="episodes-loading">
            <div className="spinner" />
            <span>Loading episodes...</span>
          </div>
        ) : episodesWithTorrents.length > 0 ? (
          episodesWithTorrents.map(episode => {
            const torrents = episode.availableTorrents
            const bestTorrent = torrents.sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0]
            const stillUrl = episode.still_path
              ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
              : null

            return (
              <div key={episode.id} className="episode-card">
                <div className="episode-still-wrapper">
                  {stillUrl ? (
                    <img src={stillUrl} alt={episode.name} className="episode-still" loading="lazy" />
                  ) : (
                    <div className="episode-still-placeholder">
                      <span className="episode-number-large">{episode.episode_number}</span>
                    </div>
                  )}
                </div>
                <div className="episode-info">
                  <div className="episode-header-row">
                    <span className="episode-badge">
                      S{String(selectedSeason).padStart(2, '0')}E{String(episode.episode_number).padStart(2, '0')}
                    </span>
                    <h3 className="episode-name">{episode.name || `Episode ${episode.episode_number}`}</h3>
                    {episode.runtime && (
                      <span className="episode-runtime text-meta">{formatDuration(episode.runtime)}</span>
                    )}
                  </div>
                  {episode.overview && <p className="episode-overview">{episode.overview}</p>}
                  {episode.vote_average > 0 && (
                    <span className="episode-rating">
                      <Star size={11} fill="currentColor" /> {episode.vote_average.toFixed(1)}
                    </span>
                  )}

                  {/* Torrent info + stream button */}
                  <div className="episode-torrents">
                    {torrentsLoading ? (
                      <div className="episode-torrent-loading">
                        <div className="spinner" style={{ width: 14, height: 14 }} />
                        <span>Finding sources...</span>
                      </div>
                    ) : torrents.length > 0 ? (
                      <div className="episode-torrent-info">
                        <span className="episode-torrent-count text-meta">
                          {torrents.length} source{torrents.length !== 1 ? 's' : ''}
                          {bestTorrent && ` · ${bestTorrent.seeds || 0} seeds`}
                        </span>
                        {torrents.slice(0, 3).map((t, i) => (
                          <span key={i} className="badge badge-quality" style={{ marginRight: 4 }}>
                            {t.quality || 'Unknown'}
                          </span>
                        ))}
                        {torrents.length > 3 && (
                          <span className="text-meta">+{torrents.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-meta">No sources available</span>
                    )}

                    <button
                      className={`btn btn-sm ${bestTorrent ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => bestTorrent && handleStream(bestTorrent)}
                      disabled={!bestTorrent || streamingHash !== null}
                    >
                      {streamingHash === (bestTorrent?.hash || episode.id) ? (
                        <div className="spinner" style={{ width: 14, height: 14 }} />
                      ) : (
                        <><Play size={14} fill="currentColor" /> Stream</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="episodes-empty">
            <p>No episodes found for this season.</p>
          </div>
        )}
      </div>
    </div>
  )
}
