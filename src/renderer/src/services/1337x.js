/**
 * 1337x torrent source — scrapes HTML via main-process IPC (bypasses CORS).
 * No official API — parses search + detail pages.
 */

const BASE = 'https://1337x.to'
const CATEGORY_MOVIE = 'Movies'
const CATEGORY_TV = 'TV'

function parseSize(str) {
  if (!str) return 0
  const num = parseFloat(str)
  if (str.includes('TB')) return num * 1024 * 1024 * 1024 * 1024
  if (str.includes('GB')) return num * 1024 * 1024 * 1024
  if (str.includes('MB')) return num * 1024 * 1024
  if (str.includes('KB')) return num * 1024
  return Math.round(num) || 0
}

function parseQuality(name) {
  if (!name) return 'Unknown'
  if (/2160p|4k|uhd/i.test(name)) return '2160p'
  if (/1080p|full.?hd/i.test(name)) return '1080p'
  if (/720p|hd/i.test(name)) return '720p'
  if (/480p/i.test(name)) return '480p'
  return 'Unknown'
}

function parseSeasonEpisode(name) {
  if (!name) return null
  const m = name.match(/[Ss](\d{1,2})[Ee](\d{1,2})/)
  if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) }
  return null
}

/**
 * Fetch HTML page via IPC (main process Node.js, no CORS).
 */
async function fetchPage(url) {
  const fn = window.electron?.fetch?.html
  if (!fn) throw new Error('electron.fetch.html not available')
  return fn(url)
}

/**
 * Parse HTML string into Document.
 */
function parseHtml(html) {
  return new DOMParser().parseFromString(html, 'text/html')
}

/**
 * Search 1337x and return normalized torrents (without magnet — call getMagnetUrl for those).
 */
async function searchByImdbId(imdbId, type = 'movie') {
  const category = type === 'movie' ? CATEGORY_MOVIE : CATEGORY_TV

  // Try category-search first, fall back to general search
  let html
  try {
    html = await fetchPage(`${BASE}/category-search/${encodeURIComponent(imdbId)}/${category}/1/`)
  } catch {
    try {
      html = await fetchPage(`${BASE}/search/${encodeURIComponent(imdbId)}/1/`)
    } catch {
      return []
    }
  }

  const doc = parseHtml(html)

  // 1337x search results live in table.table tbody tr
  const rows = doc.querySelectorAll('table.table tbody tr')
  if (!rows.length) return []

  const results = []
  for (const row of rows) {
    try {
      const tds = row.querySelectorAll('td')
      if (tds.length < 4) continue

      // Name + detail link: first td > a:nth-child(2) (skip category icon link)
      const nameLink = tds[0]?.querySelector('a:nth-child(2)') || tds[0]?.querySelector('a[href*="/torrent/"]')
      if (!nameLink) continue
      const title = nameLink.textContent?.trim()
      const detailPath = nameLink.getAttribute('href')

      // Seeds: third td
      const seedsText = tds[1]?.textContent?.trim()
      const seeds = parseInt(seedsText, 10) || 0

      // Leeches: fourth td
      const peersText = tds[2]?.textContent?.trim()
      const peers = parseInt(peersText, 10) || 0

      // Size + upload date: last children — size is in a span
      const sizeSpan = tds[3]?.querySelector('span')
      const sizeText = sizeSpan?.textContent?.trim() || ''
      const sizeBytes = parseSize(sizeText)

      results.push({
        title,
        seeds,
        peers,
        size_bytes: sizeBytes,
        quality: parseQuality(title),
        season: 0,
        episode: 0,
        detailPath,
        source: '1337x'
      })
    } catch {
      // skip malformed rows
    }
  }

  // Sort by seeds desc
  results.sort((a, b) => b.seeds - a.seeds)

  // For TV, attempt to parse season/episode from title
  if (type === 'tv') {
    for (const r of results) {
      const se = parseSeasonEpisode(r.title)
      if (se) {
        r.season = se.season
        r.episode = se.episode
      }
    }
  }

  // Fetch detail pages for top 5 results to get magnet links
  const topN = results.slice(0, 5)
  const magnetResults = await Promise.allSettled(
    topN.map(async (r) => {
      try {
        const detailHtml = await fetchPage(`${BASE}${r.detailPath}`)
        const detailDoc = parseHtml(detailHtml)

        // Magnet link: <a href="magnet:?...">
        const magnetA = detailDoc.querySelector('a[href^="magnet:"]')
        const magnetUrl = magnetA?.getAttribute('href') || ''

        // Extract info_hash from magnet
        let hash = ''
        if (magnetUrl) {
          const hashMatch = magnetUrl.match(/btih:([a-fA-F0-9]{40})/)
          if (hashMatch) hash = hashMatch[1].toLowerCase()
        }

        return { detailPath: r.detailPath, magnet_url: magnetUrl, hash }
      } catch {
        return { detailPath: r.detailPath, magnet_url: '', hash: '' }
      }
    })
  )

  // Merge magnet links back
  const magnetMap = {}
  for (const res of magnetResults) {
    if (res.status === 'fulfilled' && res.value) {
      magnetMap[res.value.detailPath] = res.value
    }
  }

  return results.map(r => {
    const extra = magnetMap[r.detailPath]
    const se = type === 'tv' ? parseSeasonEpisode(r.title) : null
    return {
      title: r.title,
      hash: extra?.hash || '',
      magnet_url: extra?.magnet_url || '',
      seeds: r.seeds,
      peers: r.peers,
      size_bytes: r.size_bytes,
      quality: r.quality,
      season: se?.season || (type === 'tv' ? r.season : 0),
      episode: se?.episode || (type === 'tv' ? r.episode : 0),
      source: '1337x'
    }
  }).filter(r => r.magnet_url) // only return results with magnet links
}

export { searchByImdbId }
