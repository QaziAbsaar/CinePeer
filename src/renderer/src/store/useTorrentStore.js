import { create } from 'zustand'

const useTorrentStore = create((set, get) => ({
  // ── Active Torrents ───────────────────────────────────────
  activeTorrents: {},

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

      return {
        activeTorrents: {
          ...s.activeTorrents,
          [infoHash]: {
            ...torrent,
            ...progressData,
            status: progressData.progress >= 1 ? 'completed' : 'downloading'
          }
        }
      }
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
  }
}))

export default useTorrentStore
