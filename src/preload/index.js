const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  torrent: {
    add: (magnetUri) => ipcRenderer.invoke('torrent:add', magnetUri),
    getProgress: (infoHash) => ipcRenderer.invoke('torrent:progress', infoHash),
    destroy: (infoHash) => ipcRenderer.invoke('torrent:destroy', infoHash),
    listActive: () => ipcRenderer.invoke('torrent:list')
  },
  system: {
    getDownloadPath: () => ipcRenderer.invoke('system:getDownloadPath'),
    getUserDataPath: () => ipcRenderer.invoke('system:getUserDataPath')
  }
})
