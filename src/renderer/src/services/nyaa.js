/**
 * Nyaa.si torrent source — fetches RSS feed via IPC.
 */
import { buildMagnetUri, TRACKERS } from '../utils/constants'

const CATEGORY_ANIME = '1_0'
const CATEGORY_ANIME_ENG = '1_2'
const CATEGORY_ANIME_RAW = '1_1'
const CATEGORY_ANIME_SUB = '1_4'

const CATEGORY_MAP = {
  all: CATEGORY_ANIME,
  'english-translated': CATEGORY_ANIME_ENG,
  raw: CATEGORY_ANIME_RAW,
  subbed: CATEGORY_ANIME_SUB
}

const NYAA_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://tracker.leechers-paradise.org:6969/announce',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://open.demonii.com:1337/announce',
  'udp://p4p.arenabg.com:1337'
]

function buildMagnet(infoHash, name) {
  const enc = encodeURIComponent(name)
  const tr = [...new Set([...NYAA_TRACKERS, ...TRACKERS])]
    .map(t => `&tr=${encodeURIComponent(t)}`).join('')
  return `magnet:?xt=urn:btih:${infoHash}&dn=${enc}${tr}`
}

function parseQuality(title) {
  if (!title) return 'Unknown'
  if (/2160p|4k|uhd/i.test(title)) return '2160p'
  if (/1080p/i.test(title)) return '1080p'
  if (/720p/i.test(title)) return '720p'
  if (/480p/i.test(title)) return '480p'
  return 'Unknown'
}

function parseEpisode(title) {
  const m = title.match(/[-–—]\s*(\d+)\s*(?:v\d)?\s*(?:\(|\[|$)/)
  if (m) return parseInt(m[1], 10)
  const m2 = title.match(/[Ee]p\s*\.?\s*(\d+)/i)
  if (m2) return parseInt(m2[1], 10)
  return 0
}

/**
 * Search Nyaa.si via RSS feed.
 * @param {string} query - Search term
 * @param {Object} opts
 * @param {string} [opts.category='all'] - all/english-translated/raw/subbed
 * @param {number} [opts.page=1] - Page number (0-based, Nyaa.si uses offset)
 * @param {'seeders'|'size'|'name'|'created'} [opts.sort='seeders'] - Sort field
 * @param {'desc'|'asc'} [opts.order='desc'] - Sort order
 */
export async function searchAnime(query = '', opts = {}) {
  const {
    category = 'all',
    page = 0,
    sort = 'seeders',
    order = 'desc'
  } = opts

  const cat = CATEGORY_MAP[category] || CATEGORY_ANIME
  const params = new URLSearchParams({ page: 'rss', c: cat, s: sort, o: order })
  if (query) params.set('q', query)
  if (page > 0) params.set('p', page)

  const url = `https://nyaa.si/?${params.toString()}`
  const fn = window.electron?.fetch?.html
  if (!fn) return { results: [], total: 0 }

  let xml
  try {
    xml = await fn(url)
  } catch {
    return { results: [], total: 0 }
  }

  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const items = doc.querySelectorAll('item')
  if (!items.length) return { results: [], total: 0 }

  const results = []
  for (const item of items) {
    try {
      const title = item.querySelector('title')?.textContent || ''
      const link = item.querySelector('link')?.textContent || ''
      const guid = item.querySelector('guid')?.textContent || ''

      // Namespace elements via getElementsByTagName
      const seedersEl = item.getElementsByTagName('nyaa:seeders')[0]
      const leechersEl = item.getElementsByTagName('nyaa:leechers')[0]
      const downloadsEl = item.getElementsByTagName('nyaa:downloads')[0]
      const infoHashEl = item.getElementsByTagName('nyaa:infoHash')[0]
      const sizeEl = item.getElementsByTagName('nyaa:size')[0]
      const categoryEl = item.getElementsByTagName('nyaa:category')[0]
      const trustedEl = item.getElementsByTagName('nyaa:trusted')[0]

      const seeders = parseInt(seedersEl?.textContent, 10) || 0
      const leechers = parseInt(leechersEl?.textContent, 10) || 0
      const downloads = parseInt(downloadsEl?.textContent, 10) || 0
      const infoHash = infoHashEl?.textContent || ''
      const sizeBytes = parseInt(sizeEl?.textContent, 10) || 0
      const nyaaCategory = categoryEl?.textContent || ''
      const trusted = trustedEl?.textContent === 'Yes'

      if (!infoHash) continue

      const magnet = buildMagnet(infoHash, title)

      results.push({
        title: title.trim(),
        hash: infoHash.toLowerCase(),
        magnet_url: magnet,
        seeders,
        leechers,
        downloads,
        size_bytes: sizeBytes,
        quality: parseQuality(title),
        episode: parseEpisode(title),
        category: nyaaCategory,
        trusted,
        link,
        guid,
        source: 'nyaa'
      })
    } catch {
      // skip malformed entries
    }
  }

  return {
    results: results.sort((a, b) => b.seeders - a.seeders),
    total: results.length
  }
}
