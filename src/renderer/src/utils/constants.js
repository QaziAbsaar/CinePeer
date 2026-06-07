// ── API URLs ──────────────────────────────────────────────
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
export const IMAGE_SIZES = {
  poster: { small: 'w185', medium: 'w342', large: 'w500', original: 'original' },
  backdrop: { small: 'w300', large: 'w1280', original: 'original' },
  profile: { small: 'w45', medium: 'w185', large: 'h632' }
}
export const FANART_BASE_URL = 'https://webservice.fanart.tv/v3'
export const YTS_BASE_URL = 'https://yts.mx/api/v2'
export const EZTV_BASE_URL = 'https://eztv.re/api'

// ── Placeholder image (data-URI tiny dark placeholder) ────
export const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="450" fill="%2312121A"%3E%3Crect width="300" height="450"/%3E%3Ctext x="50%25" y="50%25" fill="%2355556A" font-family="sans-serif" font-size="14" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E'

// ── TMDB Genre Map ────────────────────────────────────────
export const GENRES = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western'
}

// ── YTS Genre List ────────────────────────────────────────
export const YTS_GENRES = [
  'All', 'Action', 'Adventure', 'Animation', 'Biography', 'Comedy',
  'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'Film-Noir',
  'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance',
  'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western'
]

// ── Sort Options ──────────────────────────────────────────
export const SORT_OPTIONS = [
  { value: 'date_added', label: 'Latest' },
  { value: 'rating', label: 'Rating' },
  { value: 'year', label: 'Year' },
  { value: 'title', label: 'Title' },
  { value: 'seeds', label: 'Seeds' },
  { value: 'download_count', label: 'Downloads' },
  { value: 'like_count', label: 'Likes' }
]

// ── Quality Options ───────────────────────────────────────
export const QUALITY_OPTIONS = ['All', '720p', '1080p', '2160p', '3D']

// ── Year Range ────────────────────────────────────────────
export const YEAR_OPTIONS = (() => {
  const years = ['All']
  const currentYear = new Date().getFullYear()
  for (let y = currentYear; y >= 1970; y--) {
    years.push(String(y))
  }
  return years
})()

// ── Public Trackers ───────────────────────────────────────
export const TRACKERS = [
  'udp://open.demonii.com:1337/announce',
  'udp://tracker.openbittorrent.com:80',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://torrent.gresille.org:80/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.leechers-paradise.org:6969'
]

// ── Build Magnet URI ──────────────────────────────────────
export function buildMagnetUri(hash, name) {
  const encodedName = encodeURIComponent(name)
  const trackerParams = TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('')
  return `magnet:?xt=urn:btih:${hash}&dn=${encodedName}${trackerParams}`
}

// ── Format Helpers ────────────────────────────────────────
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatDuration(minutes) {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatTimeRemaining(ms) {
  if (!ms || ms === Infinity) return '∞'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
