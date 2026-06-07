const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  torrent: {
    add: (magnetUri, downloadLimit = 0) => ipcRenderer.invoke('torrent:add', { magnetUri, downloadLimit }),
    getProgress: (infoHash) => ipcRenderer.invoke('torrent:progress', infoHash),
    destroy: (infoHash) => ipcRenderer.invoke('torrent:destroy', infoHash),
    listActive: () => ipcRenderer.invoke('torrent:list')
  },
  fetch: {
    html: (url) => ipcRenderer.invoke('fetch:html', url)
  },
  system: {
    getDownloadPath: () => ipcRenderer.invoke('system:getDownloadPath'),
    getUserDataPath: () => ipcRenderer.invoke('system:getUserDataPath'),
    openFolder: (folderPath) => ipcRenderer.invoke('system:openFolder', folderPath),
    selectDirectory: () => ipcRenderer.invoke('system:selectDirectory'),
    openExternal: (url) => ipcRenderer.invoke('system:openExternal', url)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  windowControls: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
})
