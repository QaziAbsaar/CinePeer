const { app, BrowserWindow, ipcMain, shell, session } = require('electron')
const path = require('path')
const { TorrentManager } = require('./torrent')

let mainWindow = null
let torrentManager = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0F0F0F',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0F0F0F',
      symbolColor: '#EAEAEA',
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    show: false
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Dev or production URL
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
          "img-src 'self' data: https://image.tmdb.org https://img.yts.mx; " +
          "media-src 'self' http://localhost:*; " +
          "connect-src 'self' https://api.themoviedb.org https://yts.mx https://eztv.re http://localhost:*;"
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
    return torrentManager.getProgress(infoHash)
  })

  ipcMain.handle('torrent:destroy', async (_, infoHash) => {
    return await torrentManager.destroyTorrent(infoHash)
  })

  ipcMain.handle('torrent:list', async () => {
    return torrentManager.listActive()
  })

  ipcMain.handle('system:getDownloadPath', () => {
    return path.join(app.getPath('downloads'), 'StreamVault')
  })

  ipcMain.handle('system:getUserDataPath', () => {
    return app.getPath('userData')
  })
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

app.on('window-all-closed', () => {
  if (torrentManager) {
    torrentManager.destroyAll()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
