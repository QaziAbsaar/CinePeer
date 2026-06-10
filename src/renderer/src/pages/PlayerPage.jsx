import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Subtitles, RefreshCw, PictureInPicture2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useTorrentStore from '../store/useTorrentStore'
import useAppStore from '../store/useAppStore'
import { formatSpeed } from '../utils/constants'
import { searchSubtitles, downloadSubtitle, webVttToDataUri } from '../services/opensubtitles'
import './PlayerPage.css'

// Common subtitle languages
const SUBTITLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' }
]

// Playback speed options (Prime Video range: 0.75–2.0)
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3]

// Module-level track URL for cleanup
let _trackUrl = null

export default function PlayerPage() {
  const navigate = useNavigate()
  const { currentStream, pollProgress, activeTorrents, removeTorrent } = useTorrentStore()
  const { opensubtitlesApiKey, subtitleLanguage, setSubtitleLanguage } = useAppStore()
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)
  const progressWrapRef = useRef(null)
  const hideTimerRef = useRef(null)
  const wakeLockRef = useRef(null)
  const mountedRef = useRef(true)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [buffering, setBuffering] = useState(true)
  const [torrentInfo, setTorrentInfo] = useState(null)
  const [showSubtitlePicker, setShowSubtitlePicker] = useState(false)
  const [subtitleLoading, setSubtitleLoading] = useState(false)
  const [showCC, setShowCC] = useState(true)
  const [streamError, setStreamError] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSpeedPicker, setShowSpeedPicker] = useState(false)
  const [resumePosition, setResumePosition] = useState(null)
  const [hoverTime, setHoverTime] = useState(null)
  const [hoverX, setHoverX] = useState(0)
  const [isPip, setIsPip] = useState(false)

  // ── Continue watching: save/restore position ────────────────
  const RESUME_KEY = currentStream?.infoHash ? `sv_resume_${currentStream.infoHash}` : null

  const savePosition = useCallback(() => {
    if (!RESUME_KEY || !videoRef.current || !duration) return
    const pos = videoRef.current.currentTime
    if (pos < 5) return
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify({
        position: pos,
        duration,
        title: currentStream?.title || '',
        updatedAt: Date.now()
      }))
    } catch {}
  }, [RESUME_KEY, duration, currentStream])

  // On mount, check for saved resume position
  useEffect(() => {
    if (!RESUME_KEY || !currentStream) return
    try {
      const saved = localStorage.getItem(RESUME_KEY)
      if (saved) {
        const data = JSON.parse(saved)
        if (data.position > 10 && data.position / data.duration < 0.95) {
          setResumePosition(data.position)
        }
      }
    } catch {}
  }, [RESUME_KEY, currentStream])

  // Save position periodically
  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (!isPlaying || !RESUME_KEY) return
    saveTimerRef.current = setInterval(savePosition, 30000)
    return () => clearInterval(saveTimerRef.current)
  }, [isPlaying, RESUME_KEY, savePosition])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    savePosition()
  }, [savePosition])

  // Save position on unmount
  useEffect(() => {
    return () => {
      if (RESUME_KEY && videoRef.current?.currentTime > 5) {
        try {
          localStorage.setItem(RESUME_KEY, JSON.stringify({
            position: videoRef.current.currentTime,
            duration: videoRef.current.duration,
            title: currentStream?.title || '',
            updatedAt: Date.now()
          }))
        } catch {}
      }
    }
  }, [RESUME_KEY, currentStream])

  const handleResume = useCallback(() => {
    if (videoRef.current && resumePosition) {
      videoRef.current.currentTime = resumePosition
    }
    setResumePosition(null)
  }, [resumePosition])

  const handleStartOver = useCallback(() => {
    setResumePosition(null)
    if (RESUME_KEY) {
      try { localStorage.removeItem(RESUME_KEY) } catch {}
    }
  }, [RESUME_KEY])

  // ── Cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
      if (_trackUrl) {
        URL.revokeObjectURL(_trackUrl)
        _trackUrl = null
      }
    }
  }, [])

  // ── Screen Wake Lock ───────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return
    let cancelled = false
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          const lock = await navigator.wakeLock.request('screen')
          if (!cancelled) wakeLockRef.current = lock
          else lock.release().catch(() => {})
        }
      } catch {}
    }
    requestWakeLock()
    return () => {
      cancelled = true
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
        wakeLockRef.current = null
      }
    }
  }, [isPlaying])

  // ── Disable right-click on player container ───────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const preventCtx = (e) => e.preventDefault()
    el.addEventListener('contextmenu', preventCtx)
    return () => el.removeEventListener('contextmenu', preventCtx)
  }, [])

  // ── Auto-fetch subtitles when stream starts ────────────────
  useEffect(() => {
    if (!currentStream || !opensubtitlesApiKey || !currentStream.infoHash) return
    const fetchSubtitles = async () => {
      const imdbId = currentStream.imdb_id || currentStream.mediaInfo?.imdb_id
      if (!imdbId) return
      const mediaType = currentStream?.mediaType
      setSubtitleLoading(true)
      try {
        const result = await searchSubtitles({ imdbId, language: subtitleLanguage || 'en', type: mediaType === 'tv' ? 'episode' : undefined })
        const subs = result?.data || []
        if (subs.length > 0) {
          const fileId = subs[0].attributes?.files?.[0]?.file_id
          if (fileId) {
            const webvtt = await downloadSubtitle(fileId)
            if (webvtt && mountedRef.current) {
              if (_trackUrl) URL.revokeObjectURL(_trackUrl)
              _trackUrl = webVttToDataUri(webvtt)
              const video = videoRef.current
              if (video) {
                const oldTrack = video.querySelector('track')
                if (oldTrack) oldTrack.remove()
                const track = document.createElement('track')
                track.kind = 'subtitles'
                track.label = subs[0].attributes?.language || 'English'
                track.srclang = subtitleLanguage || 'en'
                track.src = _trackUrl
                track.default = showCC
                video.appendChild(track)
              }
            }
          }
        }
      } catch (e) {
        console.error('Subtitle fetch failed:', e)
      } finally {
        if (mountedRef.current) setSubtitleLoading(false)
      }
    }
    fetchSubtitles()
  }, [currentStream, opensubtitlesApiKey])

  // ── Handle subtitle language change ────────────────────────
  const changeSubtitleLanguage = useCallback(async (langCode) => {
    setSubtitleLanguage(langCode)
    setShowSubtitlePicker(false)
    if (!currentStream?.imdb_id && !currentStream?.mediaInfo?.imdb_id) return
    setSubtitleLoading(true)
    try {
      const imdbId = currentStream.imdb_id || currentStream.mediaInfo?.imdb_id
      const mediaType = currentStream?.mediaType
      const result = await searchSubtitles({ imdbId, language: langCode, type: mediaType === 'tv' ? 'episode' : undefined })
      const subs = result?.data || []
      if (subs.length > 0 && mountedRef.current) {
        const fileId = subs[0].attributes?.files?.[0]?.file_id
        if (fileId) {
          const webvtt = await downloadSubtitle(fileId)
          if (webvtt) {
            if (_trackUrl) URL.revokeObjectURL(_trackUrl)
            _trackUrl = webVttToDataUri(webvtt)
            const video = videoRef.current
            if (video) {
              const oldTrack = video.querySelector('track')
              if (oldTrack) oldTrack.remove()
              const track = document.createElement('track')
              track.kind = 'subtitles'
              track.label = subs[0].attributes?.language || langCode
              track.srclang = langCode
              track.src = _trackUrl
              track.default = showCC
              video.appendChild(track)
            }
          }
        }
      }
    } catch (e) {
      console.error('Subtitle language change failed:', e)
    } finally {
      if (mountedRef.current) setSubtitleLoading(false)
    }
  }, [currentStream, setSubtitleLanguage, showCC])

  // ── Toggle subtitles ───────────────────────────────────────
  const toggleCC = useCallback(() => {
    const newVal = !showCC
    setShowCC(newVal)
    const video = videoRef.current
    if (video) {
      for (let i = 0; i < (video.textTracks?.length || 0); i++) {
        video.textTracks[i].mode = newVal ? 'showing' : 'hidden'
      }
    }
  }, [showCC])

  // ── Change playback speed ───────────────────────────────────
  const changeSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed)
    setShowSpeedPicker(false)
    if (videoRef.current) videoRef.current.playbackRate = speed
  }, [])

  // ── Poll torrent progress ──────────────────────────────────
  useEffect(() => {
    if (!currentStream) return
    const interval = setInterval(async () => {
      await pollProgress()
      const info = activeTorrents[currentStream.infoHash]
      if (info) setTorrentInfo(info)
    }, 2000)
    return () => clearInterval(interval)
  }, [currentStream, pollProgress, activeTorrents])

  // ── Auto-hide controls ────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false)
        setShowSubtitlePicker(false)
        setShowSpeedPicker(false)
      }, 3000)
    }
  }, [isPlaying])

  // ── Keyboard shortcuts ────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      const video = videoRef.current
      if (!video) return
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          video.paused ? video.play() : video.pause()
          break
        case 'f':
          toggleFullscreen()
          break
        case 'c':
          toggleCC()
          break
        case 'ArrowLeft':
          video.currentTime = Math.max(0, video.currentTime - 10)
          break
        case 'ArrowRight':
          video.currentTime = Math.min(duration, video.currentTime + 10)
          break
        case 'ArrowUp':
          e.preventDefault()
          video.volume = Math.min(1, video.volume + 0.1)
          setVolume(video.volume)
          break
        case 'ArrowDown':
          e.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          setVolume(video.volume)
          break
        case 'm':
          video.muted = !video.muted
          setIsMuted(video.muted)
          break
        case 'Escape':
          if (resumePosition !== null) {
            setResumePosition(null)
          } else if (isFullscreen) {
            document.exitFullscreen()
          } else {
            navigate(-1)
          }
          break
        case '[': {
          e.preventDefault()
          const slower = Math.max(0.25, (video.playbackRate || 1) - 0.25)
          video.playbackRate = slower
          setPlaybackSpeed(slower)
          break
        }
        case ']': {
          e.preventDefault()
          const faster = Math.min(3, (video.playbackRate || 1) + 0.25)
          video.playbackRate = faster
          setPlaybackSpeed(faster)
          break
        }
      }
      resetHideTimer()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [duration, isFullscreen, navigate, resetHideTimer, toggleCC, resumePosition])

  // ── Fullscreen ──────────────────────────────────────────────
  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // ── Picture-in-Picture ──────────────────────────────────────
  const togglePip = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        setIsPip(false)
      } else {
        await video.requestPictureInPicture()
        setIsPip(true)
      }
    } catch (err) {
      console.warn('PiP not supported or denied:', err)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsPip(!!document.pictureInPictureElement)
    document.addEventListener('enterpictureinpicture', handler)
    document.addEventListener('leavepictureinpicture', handler)
    return () => {
      document.removeEventListener('enterpictureinpicture', handler)
      document.removeEventListener('leavepictureinpicture', handler)
    }
  }, [])

  // ── Progress bar interaction ────────────────────────────────
  const handleProgressClick = (e) => {
    const rect = progressWrapRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    if (videoRef.current) {
      videoRef.current.currentTime = percent * duration
    }
  }

  const handleProgressHover = (e) => {
    const rect = progressWrapRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    setHoverX(e.clientX - rect.left)
    setHoverTime(percent * duration)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const formatRemaining = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const remaining = duration - seconds
    const h = Math.floor(remaining / 3600)
    const m = Math.floor((remaining % 3600) / 60)
    const s = Math.floor(remaining % 60)
    if (h > 0) return `-${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `-${m}:${String(s).padStart(2, '0')}`
  }

  // ── Handle stream error ────────────────────────────────────
  const handleStreamError = () => {
    setStreamError(true)
    setBuffering(false)
  }

  // ── Empty state ────────────────────────────────────────────
  if (!currentStream) {
    return (
      <div className="player-empty">
        <p>No stream selected</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Go Back
        </button>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────
  if (streamError) {
    return (
      <div className="player-container player-error-state">
        <div className="player-error-inner">
          <p>Stream could not be loaded</p>
          <p className="text-meta">The torrent may have no seeds or the connection failed.</p>
          <div className="player-error-actions">
            <button className="btn btn-primary" onClick={() => { setStreamError(false); videoRef.current?.load() }}>
              <RefreshCw size={18} /> Retry
            </button>
            <button className="btn btn-secondary" onClick={() => { removeTorrent(currentStream.infoHash); navigate(-1) }}>
              <ArrowLeft size={18} /> Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Player ─────────────────────────────────────────────────
  const progressPercent = duration ? (currentTime / duration) * 100 : 0
  const bufferedPercent = torrentInfo ? (torrentInfo.progress || 0) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`player-container ${showControls ? '' : 'controls-hidden'}`}
      onMouseMove={(e) => {
        // Ignore zero-movement events (common in fullscreen playback)
        if (e.movementX === 0 && e.movementY === 0) return
        resetHideTimer()
      }}
      onClick={resetHideTimer}
      onContextMenu={(e) => e.preventDefault()}
      id="player-page"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="player-video"
        src={currentStream.streamUrl}
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={handlePause}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => { setBuffering(false); setStreamError(false) }}
        onError={handleStreamError}
        onEnded={() => {
          if (RESUME_KEY) try { localStorage.removeItem(RESUME_KEY) } catch {}
        }}
      />

      {/* Buffering indicator */}
      {buffering && !streamError && (
        <div className="player-buffering">
          <div className="spinner" />
          <span>Buffering...</span>
        </div>
      )}

      {/* Resume prompt */}
      {resumePosition !== null && (
        <div className="resume-prompt">
          <div className="resume-prompt-content">
            <p className="resume-prompt-title">Continue watching?</p>
            <p className="text-meta">{formatTime(resumePosition)} of {formatTime(duration)}</p>
            <div className="resume-prompt-actions">
              <button className="btn btn-primary btn-sm" onClick={handleResume}>
                <Play size={14} fill="currentColor" /> Resume
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleStartOver}>
                Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`player-controls ${showControls ? 'visible' : ''}`}>
        {/* Top bar */}
        <div className="player-top-bar">
          <button className="player-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} />
          </button>
          <span className="player-title truncate">{currentStream.title}</span>
        </div>

        {/* Center play/pause — large overlay button */}
        <div className="player-center">
          <button className="player-center-btn" onClick={(e) => {
            e.stopPropagation()
            videoRef.current?.paused ? videoRef.current.play() : videoRef.current.pause()
          }}>
            {isPlaying ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" style={{ marginLeft: 4 }} />}
          </button>
        </div>

        {/* Bottom bar */}
        <div className="player-bottom-bar">
          {/* Progress bar with hover tooltip */}
          <div
            className="player-progress-wrap"
            ref={progressWrapRef}
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className="player-progress" ref={progressRef}>
              {/* Buffered */}
              <div
                className="player-progress-buffered"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Played */}
              <div
                className="player-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
              {/* Scrubber thumb */}
              {progressPercent > 0 && (
                <div
                  className="player-progress-thumb"
                  style={{ left: `${progressPercent}%` }}
                />
              )}
            </div>
            {/* Hover time tooltip */}
            {hoverTime !== null && (
              <div
                className="player-progress-tooltip"
                style={{ left: `${hoverX}px` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Controls row */}
          <div className="player-bottom-actions">
            <div className="player-left-actions">
              {/* Play/Pause */}
              <button className="player-btn player-play-btn" onClick={(e) => {
                e.stopPropagation()
                videoRef.current?.paused ? videoRef.current.play() : videoRef.current.pause()
              }}>
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
              </button>

              {/* Skip back 10s */}
              <button className="player-btn" onClick={(e) => {
                e.stopPropagation()
                if (videoRef.current) videoRef.current.currentTime -= 10
              }}>
                <SkipBack size={18} />
              </button>

              {/* Skip forward 10s */}
              <button className="player-btn" onClick={(e) => {
                e.stopPropagation()
                if (videoRef.current) videoRef.current.currentTime += 10
              }}>
                <SkipForward size={18} />
              </button>

              {/* Volume */}
              <div className="player-volume-wrap">
                <button className="player-btn" onClick={(e) => {
                  e.stopPropagation()
                  const v = videoRef.current
                  if (v) { v.muted = !v.muted; setIsMuted(v.muted) }
                }}>
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  className="volume-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setVolume(v)
                    if (videoRef.current) videoRef.current.volume = v
                    setIsMuted(v === 0)
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Time display - elapsed / remaining (Prime style) */}
              <span className="player-time">
                {formatTime(currentTime)} / {formatRemaining(currentTime)}
              </span>
            </div>

            <div className="player-right-actions">
              {/* Torrent download info */}
              {torrentInfo && (
                <span className="player-download-info">
                  {torrentInfo.downloadSpeed > 0 && `↓ ${formatSpeed(torrentInfo.downloadSpeed)}`}
                  {' · '}
                  {Math.round((torrentInfo.progress || 0) * 100)}%
                  {' · '}
                  {torrentInfo.numPeers || 0} peers
                </span>
              )}

              {/* Subtitles */}
              {opensubtitlesApiKey && (
                <div className="subtitle-btn-wrapper">
                  <button
                    className={`player-btn ${showCC ? 'player-btn-active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowSubtitlePicker(!showSubtitlePicker)
                      setShowSpeedPicker(false)
                    }}
                    title={showCC ? 'Subtitles on' : 'Subtitles off'}
                  >
                    <Subtitles size={20} />
                  </button>
                  {showSubtitlePicker && (
                    <div className="subtitle-picker" onClick={(e) => e.stopPropagation()}>
                      <div className="subtitle-picker-header">
                        <span>Subtitles</span>
                        <button className={`subtitle-toggle ${showCC ? 'active' : ''}`} onClick={toggleCC}>
                          {showCC ? 'On' : 'Off'}
                        </button>
                      </div>
                      <div className="subtitle-lang-list">
                        {SUBTITLE_LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            className={`subtitle-lang-option ${subtitleLanguage === lang.code ? 'active' : ''}`}
                            onClick={() => changeSubtitleLanguage(lang.code)}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                      {subtitleLoading && (
                        <div className="subtitle-loading">
                          <div className="spinner" style={{ width: 14, height: 14 }} />
                          <span>Loading...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Speed */}
              <div className="speed-btn-wrapper">
                <button
                  className={`player-btn ${playbackSpeed !== 1 ? 'player-btn-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowSpeedPicker(!showSpeedPicker)
                    setShowSubtitlePicker(false)
                  }}
                  title={`Speed: ${playbackSpeed}x`}
                >
                  <span className="speed-label">{playbackSpeed}x</span>
                </button>
                {showSpeedPicker && (
                  <div className="speed-picker" onClick={(e) => e.stopPropagation()}>
                    <div className="speed-picker-header">
                      <span>Speed</span>
                    </div>
                    <div className="speed-option-list">
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          className={`speed-option ${playbackSpeed === speed ? 'active' : ''}`}
                          onClick={() => changeSpeed(speed)}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              <button
                className={`player-btn ${isPip ? 'player-btn-active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  togglePip()
                }}
                title="Picture-in-Picture"
              >
                <PictureInPicture2 size={18} />
              </button>

              {/* Fullscreen */}
              <button className="player-btn" onClick={(e) => {
                e.stopPropagation()
                toggleFullscreen()
              }}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
