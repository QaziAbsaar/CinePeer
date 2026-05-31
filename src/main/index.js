const { app, BrowserWindow, ipcMain, shell, session, Menu, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const http = require('http')

// WebTorrent is ESM-only — use dynamic import
let WebTorrent = null
async function getWebTorrent() {
  if (!WebTorrent) WebTorrent = (await import('webtorrent')).default
  return WebTorrent
}

// ── TorrentManager ──────────────────────────────────────────
class TorrentManager {
  constructor() {
    this.client = null
    this.streams = new Map()
    this._initPromise = null
  }

  async _ensureClient() {
    if (this.client) return
    if (!this._initPromise) {
      this._initPromise = (async () => {
        const WT = await getWebTorrent()
        this.client = new WT()
      })()
    }
    return this._initPromise
  }

  async addTorrent(magnetUri) {
    await this._ensureClient()
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Torrent connection timed out after 30 seconds'))
      }, 30000)

      this.client.add(magnetUri, (torrent) => {
        clearTimeout(timeout)
        const file = torrent.files.reduce((a, b) => a.length > b.length ? a : b)
        const server = http.createServer((req, res) => {
          const range = req.headers.range
          const fileSize = file.length
          if (range) {
            const parts = range.replace(/bytes=/, '').split('-')
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
            const chunkSize = end - start + 1
            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${fileSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunkSize,
              'Content-Type': 'video/mp4',
              'Access-Control-Allow-Origin': '*'
            })
            const stream = file.createReadStream({ start, end })
            stream.pipe(res)
          } else {
            res.writeHead(200, {
              'Content-Length': fileSize,
              'Content-Type': 'video/mp4',
              'Access-Control-Allow-Origin': '*'
            })
            file.createReadStream().pipe(res)
          }
        })
        server.listen(0, () => {
          const port = server.address().port
          this.streams.set(torrent.infoHash, { server, torrent, port })
          resolve({
            streamUrl: `http://localhost:${port}`,
            infoHash: torrent.infoHash,
            fileName: file.name,
            fileSize: file.length
          })
        })
      })
      this.client.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    })
  }

  async getProgress(infoHash) {
    await this._ensureClient()
    const entry = this.streams.get(infoHash)
    if (!entry) return null
    const { torrent } = entry
    return {
      progress: Math.round(torrent.progress * 100) / 100,
      downloadSpeed: torrent.downloadSpeed,
      uploadSpeed: torrent.uploadSpeed,
      numPeers: torrent.numPeers,
      downloaded: torrent.downloaded,
      uploaded: torrent.uploaded,
      timeRemaining: torrent.timeRemaining,
      ratio: torrent.ratio
    }
  }

  async destroyTorrent(infoHash) {
    await this._ensureClient()
    const entry = this.streams.get(infoHash)
    if (!entry) return false
    return new Promise((resolve) => {
      entry.server.close(() => {
        entry.torrent.destroy(() => {
          this.streams.delete(infoHash)
          resolve(true)
        })
      })
    })
  }

  async listActive() {
    await this._ensureClient()
    const list = []
    this.streams.forEach((entry, infoHash) => {
      list.push({
        infoHash,
        name: entry.torrent.name,
        progress: Math.round(entry.torrent.progress * 100) / 100,
        downloadSpeed: entry.torrent.downloadSpeed,
        numPeers: entry.torrent.numPeers,
        port: entry.port
      })
    })
    return list
  }

  async destroyAll() {
    await this._ensureClient()
    this.streams.forEach((entry) => {
      entry.server.close()
      entry.torrent.destroy()
    })
    this.streams.clear()
    this.client.destroy()
  }
}

// ── Main Process ───────────────────────────────────────────
let mainWindow = null
let torrentManager = null

function createWindow() {
  const windowOptions = {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0F0F0F',
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    show: false
  }

  mainWindow = new BrowserWindow(windowOptions)

  // Remove default menu bar (File, Edit, View, Help)
  Menu.setApplicationMenu(null)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function setupCSP() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: https://img.yts.mx https://m.media-amazon.com https://assets.fanart.tv; " +
          "media-src 'self' http://localhost:*; " +
          "connect-src 'self' https://www.omdbapi.com https://webservice.fanart.tv https://yts.mx https://eztv.re http://localhost:*;"
        ]
      }
    })
  })
}

function registerIPC() {
  torrentManager = new TorrentManager()

  ipcMain.handle('torrent:add', async (_, magnetUri) => {
    return await torrentManager.addTorrent(magnetUri)
  })

  ipcMain.handle('torrent:progress', async (_, infoHash) => {
    return await torrentManager.getProgress(infoHash)
  })

  ipcMain.handle('torrent:destroy', async (_, infoHash) => {
    return await torrentManager.destroyTorrent(infoHash)
  })

  ipcMain.handle('torrent:list', async () => {
    return await torrentManager.listActive()
  })

  ipcMain.handle('system:getDownloadPath', () => {
    return path.join(app.getPath('downloads'), 'CinePeer')
  })

  ipcMain.handle('system:getUserDataPath', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('system:openFolder', async (_, folderPath) => {
    try {
      const dir = path.dirname(folderPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      await shell.openPath(folderPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('system:selectDirectory', async () => {
    const result = await require('electron').dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── Window controls (for frameless Linux) ────────────────
  ipcMain.on('window:minimize', () => mainWindow?.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow?.close())
}

app.whenReady().then(() => {
  setupCSP()
  registerIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  if (torrentManager) {
    await torrentManager.destroyAll()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
