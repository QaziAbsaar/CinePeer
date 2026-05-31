const WebTorrent = require('webtorrent')
const http = require('http')

class TorrentManager {
  constructor() {
    this.client = new WebTorrent()
    this.streams = new Map() // infoHash → { server, torrent, port }
  }

  addTorrent(magnetUri) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Torrent connection timed out after 30 seconds'))
      }, 30000)

      this.client.add(magnetUri, (torrent) => {
        clearTimeout(timeout)

        // Find the largest file (the video)
        const file = torrent.files.reduce((a, b) =>
          a.length > b.length ? a : b
        )

        // Create HTTP stream server with range request support
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

  getProgress(infoHash) {
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

  listActive() {
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

  destroyAll() {
    this.streams.forEach((entry) => {
      entry.server.close()
      entry.torrent.destroy()
    })
    this.streams.clear()
    this.client.destroy()
  }
}

module.exports = { TorrentManager }
