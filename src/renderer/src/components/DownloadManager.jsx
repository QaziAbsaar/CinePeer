import { useEffect, useState } from 'react'
import { X, Pause, Trash2, Download, FolderOpen, Clock, RotateCcw, Save } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import useTorrentStore from '../store/useTorrentStore'
import useToastStore from '../store/useToastStore'
import { formatBytes, formatSpeed, formatTimeRemaining } from '../utils/constants'
import './DownloadManager.css'

export default function DownloadManager() {
  const { isDownloadManagerOpen, closeDownloadManager } = useAppStore()
  const { addToast } = useToastStore()
  const {
    activeTorrents, removeTorrent, pollProgress,
    downloadHistory, removeFromHistory, clearHistory
  } = useTorrentStore()
  const [savingHash, setSavingHash] = useState(null)

  const torrentList = Object.entries(activeTorrents).filter(([k]) => k !== '_pending')
  const showHistory = downloadHistory.length > 0

  // Poll progress every 2 seconds
  useEffect(() => {
    if (!isDownloadManagerOpen || torrentList.length === 0) return
    const interval = setInterval(pollProgress, 2000)
    return () => clearInterval(interval)
  }, [isDownloadManagerOpen, torrentList.length, pollProgress])

  const handleSaveToDisk = async (torrent) => {
    const hash = torrent.infoHash || torrent._infoHash
    if (!hash || savingHash === hash) return
    setSavingHash(hash)
    try {
      const result = await window.electron.torrent.saveToDisk(hash)
      if (result.success) {
        addToast(`Saved to ${result.path}`, 'success')
      } else {
        addToast(`Save failed: ${result.error}`, 'error')
      }
    } catch (e) {
      addToast(`Save failed: ${e.message}`, 'error')
    } finally {
      setSavingHash(null)
    }
  }

  const handleOpenInFolder = async (item) => {
    try {
      const downloadPath = await window.electron.system.getDownloadPath()
      await window.electron.system.openFolder(downloadPath)
    } catch (e) {
      console.error('Failed to open folder:', e)
    }
  }

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

        {/* Active Torrents */}
        <div className="dm-list">
          {torrentList.length === 0 && !showHistory ? (
            <div className="dm-empty">
              <Download size={40} />
              <p>No active downloads</p>
              <p className="text-meta">Start streaming to see downloads here</p>
            </div>
          ) : (
            <>
              {/* Active torrents section */}
              {torrentList.length > 0 && (
                <>
                  <div className="dm-section-header">
                    <span>Active</span>
                  </div>
                  {torrentList.map(([hash, torrent]) => (
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
                            {torrent.numPeers || 0} peers
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
                        {torrent.status === 'completed' && (
                          <button
                            className="btn-icon dm-action-btn"
                            onClick={() => handleSaveToDisk(torrent)}
                            title="Save to disk"
                            disabled={savingHash === hash}
                          >
                            <Save size={16} className={savingHash === hash ? 'spin' : ''} />
                          </button>
                        )}
                        {torrent.status === 'completed' && (
                          <button
                            className="btn-icon dm-action-btn"
                            onClick={() => handleOpenInFolder(torrent)}
                            title="Open in folder"
                          >
                            <FolderOpen size={16} />
                          </button>
                        )}
                        <button
                          className="btn-icon dm-action-btn"
                          onClick={() => removeTorrent(hash)}
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Completed history section */}
              {showHistory && (
                <>
                  <div className="dm-section-header">
                    <span>History</span>
                    <button className="dm-clear-btn" onClick={clearHistory} title="Clear history">
                      <RotateCcw size={14} />
                      Clear
                    </button>
                  </div>
                  {downloadHistory.map((item) => (
                    <div key={item.infoHash || item.completedAt} className="dm-item dm-history-item">
                      <div className="dm-item-info">
                        <div className="dm-item-title truncate">{item.title || 'Unknown'}</div>
                        <div className="dm-item-meta">
                          <Clock size={12} />
                          <span>{new Date(item.completedAt).toLocaleDateString()}</span>
                          {item.fileSize && <span>{formatBytes(item.fileSize)}</span>}
                        </div>
                      </div>
                      <div className="dm-item-actions">
                        <button
                          className="btn-icon dm-action-btn"
                          onClick={() => handleOpenInFolder(item)}
                          title="Open in folder"
                        >
                          <FolderOpen size={16} />
                        </button>
                        <button
                          className="btn-icon dm-action-btn"
                          onClick={() => removeFromHistory(item.infoHash)}
                          title="Remove from history"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
