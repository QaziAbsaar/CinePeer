import axios from 'axios'
import { EZTV_BASE_URL } from '../utils/constants'

const eztv = axios.create({
  baseURL: EZTV_BASE_URL,
  timeout: 15000
})

eztv.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[EZTV]', error.response?.status, error.message)
    throw error
  }
)

/**
 * Get TV show torrents by IMDB ID.
 * @param {string} imdbId - IMDB ID without 'tt' prefix (e.g. '0944947')
 * @param {number} [limit=100] - Max results
 * @param {number} [page=1] - Page number
 */
export async function getTorrents({ imdbId, limit = 100, page = 1 }) {
  // Strip 'tt' prefix if present
  const cleanId = imdbId.replace(/^tt/, '')

  const response = await eztv.get('/get-torrents', {
    params: {
      imdb_id: cleanId,
      limit,
      page
    }
  })

  const torrents = (response.torrents || []).map(t => ({
    id: t.id,
    title: t.title,
    filename: t.filename,
    season: extractSeason(t.title || t.filename),
    episode: extractEpisode(t.title || t.filename),
    quality: extractQuality(t.title || t.filename),
    sizeBytes: t.size_bytes,
    size: formatSize(t.size_bytes),
    seeds: t.seeds,
    peers: t.peers,
    magnetUrl: t.magnet_url,
    dateReleased: t.date_released_unix
  }))

  // Sort by season → episode descending (newest first)
  torrents.sort((a, b) => {
    if (b.season !== a.season) return b.season - a.season
    if (b.episode !== a.episode) return b.episode - a.episode
    return (b.seeds || 0) - (a.seeds || 0)
  })

  return {
    imdbId: cleanId,
    torrentsCount: response.torrents_count || 0,
    torrents
  }
}

// ── Helpers ───────────────────────────────────────────────
function extractSeason(title) {
  const match = title?.match(/S(\d{1,2})/i)
  return match ? parseInt(match[1], 10) : 0
}

function extractEpisode(title) {
  const match = title?.match(/E(\d{1,2})/i)
  return match ? parseInt(match[1], 10) : 0
}

function extractQuality(title) {
  if (!title) return 'Unknown'
  if (title.includes('2160p') || title.includes('4K')) return '2160p'
  if (title.includes('1080p')) return '1080p'
  if (title.includes('720p')) return '720p'
  if (title.includes('480p')) return '480p'
  return 'Unknown'
}

function formatSize(bytes) {
  if (!bytes) return 'N/A'
  const num = parseInt(bytes, 10)
  if (num === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(num) / Math.log(k))
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
