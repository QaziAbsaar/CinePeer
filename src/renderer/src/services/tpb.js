import axios from 'axios'
import { buildMagnetUri } from '../utils/constants'
import { setupRetryInterceptor } from '../utils/retry'

const TPB_API = 'https://apibay.org'

const CATEGORY_MOVIE = 201
const CATEGORY_TV = 205

const tpb = axios.create({
  baseURL: TPB_API,
  timeout: 10000
})

setupRetryInterceptor(tpb, 'TPB')

tpb.interceptors.response.use(
  (res) => res.data,
  (err) => {
    console.error('[TPB]', err.response?.status, err.message)
    throw err
  }
)

function parseQuality(name) {
  if (!name) return 'Unknown'
  if (/2160p|4k|uhd/i.test(name)) return '2160p'
  if (/1080p|full.?hd/i.test(name)) return '1080p'
  if (/720p|hd/i.test(name)) return '720p'
  if (/480p|dvdrip/i.test(name)) return '480p'
  return 'Unknown'
}

function parseSeasonEpisode(name) {
  if (!name) return null
  const m = name.match(/[Ss](\d{1,2})[Ee](\d{1,2})/)
  if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) }
  return null
}

/**
 * Search TPB by IMDB ID.
 * @param {string} imdbId - e.g. "tt1234567"
 * @param {'movie'|'tv'} type - filter by category
 * @returns {Promise<Array>} normalized torrent objects
 */
export async function searchByImdbId(imdbId, type = 'movie') {
  const data = await tpb.get('/q.php', { params: { q: imdbId } })
  if (!Array.isArray(data)) return []

  const targetCat = type === 'movie' ? CATEGORY_MOVIE : CATEGORY_TV

  return data
    .filter(t => {
      if (!t.info_hash) return false
      if (t.id === '0') return false // "No results found" sentinel
      if (targetCat && parseInt(t.category, 10) !== targetCat) return false
      return true
    })
    .map(t => {
      const se = parseSeasonEpisode(t.name)
      return {
        title: t.name,
        hash: t.info_hash,
        magnet_url: buildMagnetUri(t.info_hash, t.name),
        seeds: parseInt(t.seeders, 10) || 0,
        peers: parseInt(t.leechers, 10) || 0,
        size_bytes: parseInt(t.size, 10) || 0,
        quality: parseQuality(t.name),
        season: se?.season || 0,
        episode: se?.episode || 0,
        source: 'tpb'
      }
    })
    .sort((a, b) => b.seeds - a.seeds)
}
