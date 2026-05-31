import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useTorrentStore from '../store/useTorrentStore'
import { formatSpeed } from '../utils/constants'
import './PlayerPage.css'

export default function PlayerPage() {
  const navigate = useNavigate()
  const { currentStream, pollProgress, activeTorrents } = useTorrentStore()
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const progressRef = useRef(null)
  const hideTimerRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [buffering, setBuffering] = useState(true)
  const [torrentInfo, setTorrentInfo] = useState(null)

  // Poll torrent progress
  useEffect(() => {
    if (!currentStream) return
    const interval = setInterval(async () => {
      await pollProgress()
      const info = activeTorrents[currentStream.infoHash]
      if (info) setTorrentInfo(info)
    }, 2000)
    return () => clearInterval(interval)
  }, [currentStream, pollProgress, activeTorrents])

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimerRef.current)
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000)
    }
  }, [isPlaying])

  // Keyboard shortcuts
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
          if (isFullscreen) {
            document.exitFullscreen()
          } else {
            navigate(-1)
          }
          break
      }
      resetHideTimer()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [duration, isFullscreen, navigate, resetHideTimer])

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

  const handleProgressClick = (e) => {
    const rect = progressRef.current.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    if (videoRef.current) {
      videoRef.current.currentTime = percent * duration
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }

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

  return (
    <div
      ref={containerRef}
      className={`player-container ${showControls ? '' : 'controls-hidden'}`}
      onMouseMove={resetHideTimer}
      onClick={resetHideTimer}
      id="player-page"
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="player-video"
        src={currentStream.streamUrl}
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
      />

      {/* Buffering indicator */}
      {buffering && (
        <div className="player-buffering">
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <span>Buffering...</span>
        </div>
      )}

      {/* Controls Overlay */}
      <div className={`player-controls ${showControls ? 'visible' : ''}`}>
        {/* Top bar */}
        <div className="player-top-bar">
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={22} />
          </button>
          <span className="player-title truncate">{currentStream.title}</span>
        </div>

        {/* Center play/pause */}
        <div className="player-center">
          <button className="player-center-btn" onClick={() => {
            videoRef.current?.paused ? videoRef.current.play() : videoRef.current.pause()
          }}>
            {isPlaying ? <Pause size={48} fill="white" /> : <Play size={48} fill="white" />}
          </button>
        </div>

        {/* Bottom bar */}
        <div className="player-bottom-bar">
          {/* Progress */}
          <div
            className="player-progress"
            ref={progressRef}
            onClick={handleProgressClick}
          >
            <div
              className="player-progress-fill"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
            {torrentInfo && (
              <div
                className="player-progress-buffered"
                style={{ width: `${(torrentInfo.progress || 0) * 100}%` }}
              />
            )}
          </div>

          <div className="player-bottom-actions">
            <div className="player-left-actions">
              <button className="player-btn" onClick={() => {
                videoRef.current?.paused ? videoRef.current.play() : videoRef.current.pause()
              }}>
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>

              <button className="player-btn" onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10
              }}>
                <SkipBack size={18} />
              </button>
              <button className="player-btn" onClick={() => {
                if (videoRef.current) videoRef.current.currentTime += 10
              }}>
                <SkipForward size={18} />
              </button>

              <button className="player-btn" onClick={() => {
                const v = videoRef.current
                if (v) { v.muted = !v.muted; setIsMuted(v.muted) }
              }}>
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
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
              />

              <span className="player-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="player-right-actions">
              {torrentInfo && (
                <span className="player-download-info">
                  {torrentInfo.downloadSpeed > 0 && `↓ ${formatSpeed(torrentInfo.downloadSpeed)}`}
                  {' · '}
                  {Math.round((torrentInfo.progress || 0) * 100)}%
                  {' · '}
                  {torrentInfo.numPeers || 0} peers
                </span>
              )}

              <button className="player-btn" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
