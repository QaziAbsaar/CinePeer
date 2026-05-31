import { create } from 'zustand'

const HISTORY_KEY = 'sv_download_history'

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch { return [] }
}

function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch {}
}

const useTorrentStore = create((set, get) => ({
  // ── Active Torrents ───────────────────────────────────────
  activeTorrents: {},

  // ── Download History (persisted) ──────────────────────────
  downloadHistory: loadHistory(),

  // ── Currently Streaming ───────────────────────────────────
  currentStream: null, // { infoHash, streamUrl, title, mediaInfo }

  // ── Actions ───────────────────────────────────────────────
  addTorrent: async (magnetUri, title, mediaInfo = {}) => {
    try {
      set((s) => ({
        activeTorrents: {
          ...s.activeTorrents,
          _pending: {
            title,
            status: 'connecting',
            progress: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            numPeers: 0
          }
        }
      }))

      // Call Electron IPC to start torrent
      const result = await window.electron.torrent.add(magnetUri)

      set((s) => {
        const torrents = { ...s.activeTorrents }
        delete torrents._pending

        torrents[result.infoHash] = {
          title,
          status: 'downloading',
          streamUrl: result.streamUrl,
          fileName: result.fileName,
          fileSize: result.fileSize,
          progress: 0,
          downloadSpeed: 0,
          uploadSpeed: 0,
          numPeers: 0,
          ...mediaInfo
        }

        return {
          activeTorrents: torrents,
          currentStream: {
            infoHash: result.infoHash,
            streamUrl: result.streamUrl,
            title,
            ...mediaInfo
          }
        }
      })

      return result
    } catch (error) {
      set((s) => {
        const torrents = { ...s.activeTorrents }
        delete torrents._pending
        return { activeTorrents: torrents }
      })
      throw error
    }
  },

  updateProgress: (infoHash, progressData) => {
    set((s) => {
      const torrent = s.activeTorrents[infoHash]
      if (!torrent) return s

      const wasCompleted = torrent.status === 'completed'
      const nowCompleted = progressData.progress >= 1 && !wasCompleted

      const updated = {
        activeTorrents: {
          ...s.activeTorrents,
          [infoHash]: {
            ...torrent,
            ...progressData,
            status: progressData.progress >= 1 ? 'completed' : 'downloading'
          }
        }
      }

      // Persist to download history on completion
      if (nowCompleted) {
        const historyEntry = {
          infoHash,
          title: torrent.title,
          fileName: torrent.fileName,
          fileSize: torrent.fileSize,
          mediaId: torrent.mediaId,
          mediaType: torrent.mediaType,
          posterPath: torrent.posterPath,
          completedAt: Date.now()
        }
        const history = [historyEntry, ...s.downloadHistory].slice(0, 200)
        saveHistory(history)
        updated.downloadHistory = history
      }

      return updated
    })
  },

  removeTorrent: async (infoHash) => {
    try {
      await window.electron.torrent.destroy(infoHash)
    } catch (e) {
      console.error('Failed to destroy torrent:', e)
    }

    set((s) => {
      const torrents = { ...s.activeTorrents }
      delete torrents[infoHash]

      const newState = { activeTorrents: torrents }
      if (s.currentStream?.infoHash === infoHash) {
        newState.currentStream = null
      }
      return newState
    })
  },

  // ── Download History Actions ────────────────────────────────
  removeFromHistory: (infoHash) => {
    set((s) => {
      const history = s.downloadHistory.filter(h => h.infoHash !== infoHash)
      saveHistory(history)
      return { downloadHistory: history }
    })
  },

  clearHistory: () => {
    saveHistory([])
    set({ downloadHistory: [] })
  },

  setCurrentStream: (stream) => set({ currentStream: stream }),

  clearCurrentStream: () => set({ currentStream: null }),

  // ── Poll Progress ─────────────────────────────────────────
  pollProgress: async () => {
    const { activeTorrents, updateProgress } = get()
    const hashes = Object.keys(activeTorrents).filter(h => h !== '_pending')

    for (const hash of hashes) {
      try {
        const progress = await window.electron.torrent.getProgress(hash)
        if (progress) {
          updateProgress(hash, progress)
        }
      } catch (e) {
        // Torrent may have been removed
      }
    }
  },

  // ── Auto-Polling ─────────────────────────────────────────────
  _pollTimer: null,

  startPolling: () => {
    const existingTimer = get()._pollTimer
    if (existingTimer) return // already polling
    const timer = setInterval(() => get().pollProgress(), 2000)
    set({ _pollTimer: timer })
  },

  stopPolling: () => {
    const timer = get()._pollTimer
    if (timer) {
      clearInterval(timer)
      set({ _pollTimer: null })
    }
  },

  _checkStopPolling: () => {
    const count = Object.keys(get().activeTorrents).filter(h => h !== '_pending').length
    if (count === 0) get().stopPolling()
  }
}))

// Auto-start/stop polling based on torrent activity
const origAdd = useTorrentStore.getState().addTorrent
const origRemove = useTorrentStore.getState().removeTorrent

// Patch addTorrent to auto-start polling
useTorrentStore.setState({
  addTorrent: async (...args) => {
    useTorrentStore.getState().startPolling()
    return origAdd(...args)
  },
  removeTorrent: async (...args) => {
    const result = await origRemove(...args)
    useTorrentStore.getState()._checkStopPolling()
    return result
  }
})

export default useTorrentStore
