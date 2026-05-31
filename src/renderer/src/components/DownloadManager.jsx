import { useEffect } from 'react'
import { X, Pause, Trash2, Download, Wifi } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import useTorrentStore from '../store/useTorrentStore'
import { formatBytes, formatSpeed, formatTimeRemaining } from '../utils/constants'
import './DownloadManager.css'

export default function DownloadManager() {
  const { isDownloadManagerOpen, closeDownloadManager } = useAppStore()
  const { activeTorrents, removeTorrent, pollProgress } = useTorrentStore()

  const torrentList = Object.entries(activeTorrents).filter(([k]) => k !== '_pending')

  // Poll progress every 2 seconds
  useEffect(() => {
    if (!isDownloadManagerOpen || torrentList.length === 0) return
    const interval = setInterval(pollProgress, 2000)
    return () => clearInterval(interval)
  }, [isDownloadManagerOpen, torrentList.length, pollProgress])

  if (!isDownloadManagerOpen) return null

  return (
    <div className="dm-overlay" onClick={closeDownloadManager}>
      <div
        className="dm-panel glass-card-strong"
        onClick={(e) => e.stopPropagation()}
        id="download-manager"
      >
        {/* Header */}
        <div className="dm-header">
          <div className="dm-header-title">
            <Download size={18} />
            <h3>Downloads</h3>
            {torrentList.length > 0 && (
              <span className="dm-count">{torrentList.length}</span>
            )}
          </div>
          <button className="btn-icon" onClick={closeDownloadManager}>
            <X size={18} />
          </button>
        </div>

        {/* Torrent List */}
        <div className="dm-list">
          {torrentList.length === 0 ? (
            <div className="dm-empty">
              <Download size={40} />
              <p>No active downloads</p>
              <p className="text-meta">Start streaming to see downloads here</p>
            </div>
          ) : (
            torrentList.map(([hash, torrent]) => (
              <div key={hash} className="dm-item">
                <div className="dm-item-info">
                  <div className="dm-item-title truncate">{torrent.title || 'Unknown'}</div>
                  <div className="dm-item-meta">
                    <span className="dm-item-status">
                      {torrent.status === 'completed' ? (
                        <span className="text-complete">Complete</span>
                      ) : (
                        `${Math.round((torrent.progress || 0) * 100)}%`
                      )}
                    </span>
                    <span>
                      <Wifi size={12} /> {torrent.numPeers || 0} peers
                    </span>
                    {torrent.downloadSpeed > 0 && (
                      <span>↓ {formatSpeed(torrent.downloadSpeed)}</span>
                    )}
                    {torrent.timeRemaining && torrent.timeRemaining !== Infinity && (
                      <span>{formatTimeRemaining(torrent.timeRemaining)} left</span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar dm-progress">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.round((torrent.progress || 0) * 100)}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="dm-item-actions">
                  <button
                    className="btn-icon dm-action-btn"
                    onClick={() => removeTorrent(hash)}
                    title="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
