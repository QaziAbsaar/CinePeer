/**
 * Trakt.tv API client — handles discovery/trending lists.
 *
 * Trakt provides reliable trending, popular, and top-rated lists
 * with IMDB IDs that feed into our OMDb + Fanart.tv pipeline.
 *
 * API docs: https://trakt.docs.apiary.io/
 */

import axios from 'axios'
import { getCached, setCache } from '../utils/cache'

const TRAKT_BASE_URL = 'https://api.trakt.tv'

function getClientId() {
  return localStorage.getItem('sv_trakt_client_id') || ''
}

const traktApi = axios.create({
  baseURL: TRAKT_BASE_URL,
  timeout: 10000
})

// Attach required Trakt headers on every request
traktApi.interceptors.request.use((config) => {
  const clientId = getClientId()
  if (clientId) {
    config.headers['Content-Type'] = 'application/json'
    config.headers['trakt-api-version'] = '2'
    config.headers['trakt-api-key'] = clientId
  }
  return config
})

traktApi.interceptors.response.use(
  (r) => r.data,
  (error) => {
    console.error('[Trakt]', error.response?.status, error.message)
    throw error
  }
)

// ── Helpers ────────────────────────────────────────────────

/**
 * Normalize a single Trakt movie/show item into a minimal object
 * that the rest of the app can work with. We include imdb_id so
 * downstream (OMDb / Fanart) can enrich with full metadata + images.
 */
function toAppShape(traktItem, mediaType) {
  // Trakt trending endpoints wrap in { movie: {...} } / { show: {...} }
  // Popular/top-rated endpoints return the movie/show object directly.
  const obj = traktItem.movie || traktItem.show || traktItem
  const ids = obj.ids || {}
  const isMovie = mediaType === 'movie'

  return {
    id: ids.imdb || `trakt_${ids.trakt}`,
    imdb_id: ids.imdb || null,
    trakt_id: ids.trakt,
    title: isMovie ? obj.title : undefined,
    name: !isMovie ? obj.title : undefined,
    year: obj.year,
    overview: obj.overview || '',
    // Trakt genres are name strings — convert to { id, name } shape
    genres: (obj.genres || []).map((g) => ({ id: g, name: g.charAt(0).toUpperCase() + g.slice(1) })),
    genre_ids: [],
    genre_names: obj.genres || [],
    vote_average: obj.rating || 0,
    vote_count: obj.votes || 0,
    release_date: obj.released || (obj.year ? `${obj.year}-01-01` : ''),
    first_air_date: !isMovie && obj.released ? obj.released : undefined,
    runtime: obj.runtime,
    // Images populated later by enrichWithTrakt()
    poster_path: null,
    backdrop_path: null,
    language: obj.language || 'en',
    country: obj.country || '',
    media_type: mediaType,
    popularity: traktItem.watchers || traktItem?.watchers || 0,
    // Links for external enrichment
    trailer: obj.trailer,
    homepage: obj.homepage
  }
}

/**
 * Enrich a Trakt-derived item with poster + backdrop from Fanart.tv
 * (or fall back to OMDb Poster for the poster).
 *
 * We mutate and return the same object to avoid extra allocation.
 */
async function enrichWithImages(item) {
  if (!item.imdb_id) return item

  const fanartKey = localStorage.getItem('sv_fanart_api_key')
  const omdbKey = localStorage.getItem('sv_omdb_api_key')
  const isMovie = item.media_type === 'movie'
  const imdbId = item.imdb_id

  // ── 1. Try Fanart.tv for HD images ────────────────────
  if (fanartKey) {
    const cacheKey = `fanart_${imdbId}`
    let fanartData = getCached(cacheKey)

    if (!fanartData) {
      try {
        const endpoint = isMovie ? `/movies/${imdbId}` : `/tv/${imdbId}`
        const res = await axios.get(`https://webservice.fanart.tv/v3${endpoint}`, {
          params: { api_key: fanartKey },
          timeout: 8000
        })
        fanartData = res.data
        if (fanartData) setCache(cacheKey, fanartData)
      } catch {
        fanartData = null
      }
    }

    if (fanartData) {
      const posters = fanartData.movieposter || fanartData.tvposter || []
      const backgrounds = fanartData.moviebackground || fanartData.tvbackground || []
      if (posters.length > 0) {
        item.poster_path = posters.sort((a, b) => b.likes - a.likes)[0].url
      }
      if (backgrounds.length > 0) {
        item.backdrop_path = backgrounds.sort((a, b) => b.likes - a.likes)[0].url
      }
      // HD images found — no need for OMDb fallback
      if (item.poster_path) return item
    }
  }

  // ── 2. Fall back to OMDb Poster ───────────────────────
  if (omdbKey) {
    const cacheKey = `omdb_poster_${imdbId}`
    let posterUrl = getCached(cacheKey)

    if (!posterUrl) {
      try {
        const res = await axios.get('https://www.omdbapi.com', {
          params: { apikey: omdbKey, i: imdbId, plot: 'short' },
          timeout: 8000
        })
        const data = res.data
        if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
          posterUrl = data.Poster
          setCache(cacheKey, posterUrl)

          // Also grab overview if Trakt didn't provide one
          if (!item.overview && data.Plot && data.Plot !== 'N/A') {
            item.overview = data.Plot
          }
          // Override rating if OMDb has a better one
          const omdbRating = parseFloat(data.imdbRating)
          if (omdbRating > 0 && omdbRating !== item.vote_average) {
            item.vote_average = omdbRating
          }
        }
      } catch {
        posterUrl = null
      }
    }

    if (posterUrl) item.poster_path = posterUrl
  }

  return item
}

/**
 * Fetch a list from Trakt and enrich each item with images.
 * Returns array shaped like { results, total_results }.
 */
async function fetchList(endpoint, page = 1, mediaType = 'movie', limit = 20) {
  const clientId = getClientId()
  if (!clientId) throw new Error('Trakt client ID not configured')

  const cacheKey = `trakt_${endpoint.replace(/[^a-z0-9_]/gi, '_')}_${page}`
  let items = getCached(cacheKey)

  if (!items) {
    // Set pagination via querystring; Trakt returns最多 10 per page by default
    const data = await traktApi.get(endpoint, { params: { page, limit } })
    items = Array.isArray(data) ? data : []
    // Cache for 5 minutes
    setCache(cacheKey, items, 5 * 60 * 1000)
  }

  // Map to app shape
  let results = items.map((item) => toAppShape(item, mediaType))

  // Enrich with images (parallel, capped at limit)
  const enriched = await Promise.allSettled(
    results.map((item) => enrichWithImages(item))
  )
  results = enriched.map((r, i) => (r.status === 'fulfilled' ? r.value : results[i]))

  return { results, total_results: results.length }
}

// ── Exported discovery functions ───────────────────────────

export async function getTrendingMovies(page = 1) {
  return fetchList('/movies/trending', page, 'movie')
}

export async function getTrendingShows(page = 1) {
  return fetchList('/shows/trending', page, 'tv')
}

export async function getPopularMovies(page = 1) {
  return fetchList('/movies/popular', page, 'movie')
}

export async function getPopularShows(page = 1) {
  return fetchList('/shows/popular', page, 'tv')
}

export async function getTopRatedMovies(page = 1) {
  return fetchList('/movies/top_rated', page, 'movie')
}

export async function getTopRatedShows(page = 1) {
  return fetchList('/shows/top_rated', page, 'tv')
}

// Trakt "recommended" endpoints mirror trending but with different algo
export async function getRecommendedMovies(page = 1) {
  return fetchList('/movies/recommended', page, 'movie')
}

export async function getRecommendedShows(page = 1) {
  return fetchList('/shows/recommended', page, 'tv')
}
