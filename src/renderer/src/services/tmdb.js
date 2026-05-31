import axios from 'axios'
import { TMDB_BASE_URL, TMDB_IMAGE_BASE, IMAGE_SIZES } from '../utils/constants'
import { getCached, setCache } from '../utils/cache'
import { setupRetryInterceptor } from '../utils/retry'

// Create axios instance
const tmdb = axios.create({
  baseURL: TMDB_BASE_URL,
  timeout: 10000
})

// Add retry logic with exponential backoff
setupRetryInterceptor(tmdb, 'TMDB')

// Request interceptor — append API key
tmdb.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('sv_tmdb_api_key') || import.meta.env.VITE_TMDB_API_KEY
  if (apiKey) {
    config.params = { ...config.params, api_key: apiKey }
  }
  return config
})

// Response interceptor — extract data
tmdb.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status
    console.error('[TMDB]', status, error.message)

    // Show toast for key auth failures (but not on every failed detail fetch)
    if (status === 401) {
      import('../store/useToastStore').then((m) =>
        m.default.getState().addToast(
          'Invalid TMDB API key. Check your settings.',
          'error',
          6000
        )
      )
    }

    throw error
  }
)

// ── Cached fetch wrapper ──────────────────────────────────
async function cachedFetch(cacheKey, fetchFn) {
  const cached = getCached(cacheKey)
  if (cached) return cached
  const data = await fetchFn()
  setCache(cacheKey, data)
  return data
}

// ── Trending ──────────────────────────────────────────────
export function getTrending(mediaType = 'all', timeWindow = 'week') {
  return cachedFetch(`trending_${mediaType}_${timeWindow}`, () =>
    tmdb.get(`/trending/${mediaType}/${timeWindow}`)
  )
}

// ── Movies ────────────────────────────────────────────────
export function getPopularMovies(page = 1) {
  return cachedFetch(`movies_popular_${page}`, () =>
    tmdb.get('/movie/popular', { params: { page } })
  )
}

export function getTopRatedMovies(page = 1) {
  return cachedFetch(`movies_top_rated_${page}`, () =>
    tmdb.get('/movie/top_rated', { params: { page } })
  )
}

export function getNowPlayingMovies(page = 1) {
  return cachedFetch(`movies_now_playing_${page}`, () =>
    tmdb.get('/movie/now_playing', { params: { page } })
  )
}

export function getUpcomingMovies(page = 1) {
  return cachedFetch(`movies_upcoming_${page}`, () =>
    tmdb.get('/movie/upcoming', { params: { page } })
  )
}

// ── TV Shows ──────────────────────────────────────────────
export function getPopularTV(page = 1) {
  return cachedFetch(`tv_popular_${page}`, () =>
    tmdb.get('/tv/popular', { params: { page } })
  )
}

export function getTopRatedTV(page = 1) {
  return cachedFetch(`tv_top_rated_${page}`, () =>
    tmdb.get('/tv/top_rated', { params: { page } })
  )
}

export function getOnTheAirTV(page = 1) {
  return cachedFetch(`tv_on_the_air_${page}`, () =>
    tmdb.get('/tv/on_the_air', { params: { page } })
  )
}

// ── Discover ──────────────────────────────────────────────
export function discoverByGenre(mediaType = 'movie', genreId, page = 1) {
  return cachedFetch(`discover_${mediaType}_${genreId}_${page}`, () =>
    tmdb.get(`/discover/${mediaType}`, {
      params: {
        with_genres: genreId,
        sort_by: 'popularity.desc',
        page
      }
    })
  )
}

// ── Search ────────────────────────────────────────────────
export function searchMulti(query, page = 1) {
  return tmdb.get('/search/multi', { params: { query, page } })
}

// ── Details ───────────────────────────────────────────────
export function getDetails(id, mediaType = 'movie') {
  return cachedFetch(`details_${mediaType}_${id}`, () =>
    tmdb.get(`/${mediaType}/${id}`, {
      params: { append_to_response: 'credits,videos,external_ids' }
    })
  )
}

export function getCredits(id, mediaType = 'movie') {
  return cachedFetch(`credits_${mediaType}_${id}`, () =>
    tmdb.get(`/${mediaType}/${id}/credits`)
  )
}

export function getVideos(id, mediaType = 'movie') {
  return cachedFetch(`videos_${mediaType}_${id}`, () =>
    tmdb.get(`/${mediaType}/${id}/videos`)
  )
}

export function getSimilar(id, mediaType = 'movie') {
  return cachedFetch(`similar_${mediaType}_${id}`, () =>
    tmdb.get(`/${mediaType}/${id}/similar`)
  )
}

// ── Image URL Helpers ─────────────────────────────────────
export function getPosterUrl(path, size = 'medium') {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES.poster[size]}${path}`
}

export function getBackdropUrl(path, size = 'large') {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES.backdrop[size]}${path}`
}

/**
 * Look up a movie or TV show by external ID (IMDB).
 * Used to bridge YTS data (which has IMDB IDs) to TMDB data.
 * @param {string} imdbId - e.g. 'tt1234567'
 * @param {string} [source='imdb_id'] - External source
 */
export async function lookupByExternalId(imdbId, source = 'imdb_id') {
  try {
    const data = await tmdb.get(`/find/${imdbId}`, {
      params: { external_source: source }
    })
    const movieResults = data?.movie_results || []
    const tvResults = data?.tv_results || []
    if (movieResults.length > 0) {
      return { ...movieResults[0], media_type: 'movie' }
    }
    if (tvResults.length > 0) {
      return { ...tvResults[0], media_type: 'tv' }
    }
    return null
  } catch {
    return null
  }
}

export function getProfileUrl(path, size = 'medium') {
  if (!path) return null
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES.profile[size]}${path}`
}

// ── Validate API Key ──────────────────────────────────────
export async function validateApiKey(key) {
  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/popular`, {
      params: { api_key: key },
      timeout: 5000
    })
    return response.status === 200
  } catch {
    return false
  }
}
