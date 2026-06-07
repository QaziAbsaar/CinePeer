/**
 * Unified metadata resolver — TMDB first, OMDb fallback.
 *
 * All pages import from THIS file instead of importing services directly.
 * This file exists so consumers don't need to change if the underlying
 * provider changes in the future.
 *
 * Priority:
 *   1. TMDB (if API key configured) — full metadata, images, discovery
 *   2. OMDb (if API key configured) — basic metadata, text-only fallback
 *   3. Trakt.tv (if Client ID configured) — enhances OMDb discovery
 *   4. Fanart.tv (if API key configured) — enhances images for any source
 */

import * as tmdb from './tmdb'
import * as omdb from './omdb'
import * as trakt from './trakt'
import axios from 'axios'
import { TMDB_IMAGE_BASE, IMAGE_SIZES, FANART_BASE_URL, PLACEHOLDER_IMAGE } from '../utils/constants'
import { getCached, setCache } from '../utils/cache'

// ── Active source tracking ─────────────────────────────────
let activeSource = 'tmdb' // 'tmdb' | 'omdb'

export function getActiveSource() { return activeSource }
export function isUsingOmdb() { return activeSource === 'omdb' }

// ── Key checks ─────────────────────────────────────────────
function hasTmdbKey() {
  return !!localStorage.getItem('sv_tmdb_api_key')
}

function hasOmdbKey() {
  return !!localStorage.getItem('sv_omdb_api_key')
}

function hasTraktId() {
  return !!localStorage.getItem('sv_trakt_client_id')
}

function hasFanartKey() {
  return !!localStorage.getItem('sv_fanart_api_key')
}

// ── OMDb helpers ───────────────────────────────────────────

/** Normalise an OMDb item to the TMDB-consumable shape the UI expects. */
function toTmdbShape(omdbItem, mediaType) {
  const isMovie = mediaType === 'movie' || omdbItem.Type === 'movie'
  const rating = parseFloat(omdbItem.imdbRating) || 0

  return {
    id: omdbItem.imdbID || `omdb_${Date.now()}`,
    imdb_id: omdbItem.imdbID,
    title: isMovie ? omdbItem.Title : undefined,
    name: !isMovie ? omdbItem.Title : undefined,
    poster_path: omdbItem.Poster && omdbItem.Poster !== 'N/A' ? omdbItem.Poster : null,
    backdrop_path: omdbItem._fanart_background || null,
    vote_average: rating,
    vote_count: parseInt(omdbItem.imdbVotes?.replace(/,/g, '')) || 0,
    release_date: isMovie && omdbItem.Year ? `${omdbItem.Year}-01-01` : undefined,
    first_air_date: !isMovie && omdbItem.Year ? `${omdbItem.Year}-01-01` : undefined,
    overview: omdbItem.Plot && omdbItem.Plot !== 'N/A' ? omdbItem.Plot : '',
    genre_ids: [],
    genre_names: omdbItem.Genre ? omdbItem.Genre.split(', ').filter(Boolean) : [],
    media_type: mediaType || (isMovie ? 'movie' : 'tv'),
    original_language: omdbItem.Language?.split(', ')?.[0]?.toLowerCase() || 'en',
    popularity: 0,
    rated: omdbItem.Rated,
    runtime: omdbItem.Runtime,
    actors: omdbItem.Actors,
    director: omdbItem.Director,
    ratings: omdbItem.Ratings || [],
    metascore: omdbItem.Metascore,
    awards: omdbItem.Awards
  }
}

function omdbSearchToResults(data, mediaType) {
  if (!data || data.Response !== 'True') return { results: [], total_results: 0 }
  const items = data.Search || []
  return { results: items.map((item) => toTmdbShape(item, mediaType || item.Type)), total_results: items.length }
}

// ── Fanart.tv image enrichment (applies to any source) ──────
async function enrichWithFanart(item) {
  const fanartKey = hasFanartKey()
  const imdbId = item?.imdbID || item?.imdb_id
  if (!fanartKey || !imdbId) return item

  const isMovie = item.media_type === 'movie' || item.Type === 'movie'
  const cacheKey = `fanart_${imdbId}`
  let fanartData = getCached(cacheKey)

  if (!fanartData) {
    try {
      const endpoint = isMovie ? `/movies/${imdbId}` : `/tv/${imdbId}`
      const res = await axios.get(`${FANART_BASE_URL}${endpoint}`, {
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
    if (posters.length > 0 && !item.poster_path?.startsWith('http')) {
      item.poster_path = posters.sort((a, b) => b.likes - a.likes)[0].url
    }
    if (backgrounds.length > 0) {
      item.backdrop_path = backgrounds.sort((a, b) => b.likes - a.likes)[0].url
    }
  }

  return item
}

/** Enrich an array of results with Fanart.tv images in parallel. */
async function enrichResults(results) {
  if (!hasFanartKey() || !results?.length) return results
  const enriched = await Promise.allSettled(results.map((item) => enrichWithFanart(item)))
  return enriched.map((r, i) => (r.status === 'fulfilled' ? r.value : results[i]))
}

// ── OMDb keyword fallback (when TMDB is unavailable) ────────
const MOVIE_KEYWORDS = ['avengers', 'inception', 'matrix', 'dark', 'fast', 'rings', 'pirates', 'bourne', 'mission', 'jurassic']
const TV_KEYWORDS    = ['breaking', 'game', 'stranger', 'sherlock', 'friends', 'simpsons', 'office', 'crown', 'mandalorian', 'witcher']

async function omdbKeywordSearch(keyword, page = 1, type = 'movie') {
  if (!hasOmdbKey()) return { results: [], total_results: 0 }
  const cacheKey = `omdb_search_${type}_${keyword}_${page}`
  const cached = getCached(cacheKey)
  if (cached) return cached
  const omdbApi = axios.create({ baseURL: 'https://www.omdbapi.com', timeout: 10000 })
  omdbApi.interceptors.response.use((r) => r.data, (e) => { throw e })
  const data = await omdbApi.get('/', { params: { apikey: localStorage.getItem('sv_omdb_api_key'), s: keyword, type, page } })
  const result = omdbSearchToResults(data, type)
  setCache(cacheKey, result)
  return result
}

async function omdbFallbackPage(page = 1, type = 'movie') {
  const pool = type === 'series' || type === 'tv' ? TV_KEYWORDS : MOVIE_KEYWORDS
  const idx = Math.min(page - 1, pool.length - 1)
  return omdbKeywordSearch(pool[idx], 1, type)
}

// ── Trakt-based discovery (optional, enhances OMDb fallback) ──
async function traktDiscovery(endpoint, mediaType, page = 1) {
  if (!hasTraktId()) throw new Error('No Trakt client ID')
  return trakt.fetchList(endpoint, page, mediaType)
}

// ── TMDB-first with OMDb fallback ─────────────────────────

async function withFallback(tmdbFn, omdbFn, isDiscovery = false) {
  if (hasTmdbKey()) {
    try {
      const result = await tmdbFn()
      if (result) {
        activeSource = 'tmdb'
        // Optionally enhance TMDB results with Fanart.tv HD images
        if (hasFanartKey() && result.results) {
          result.results = await enrichResults(result.results)
        }
        return result
      }
    } catch {
      // TMDB failed — fall through to OMDb
    }
  }

  // No TMDB key or TMDB failed — try OMDb
  if (hasOmdbKey()) {
    activeSource = 'omdb'
    // For discovery, try Trakt first if available (better than OMDb keyword search)
    if (isDiscovery && hasTraktId()) {
      try {
        const result = await omdbFn(true) // true = use Trakt
        if (result?.results?.length) return result
      } catch {
        // Trakt failed — fall through to OMDb keyword search
      }
    }
    try {
      return await omdbFn(false) // false = use OMDb keyword search
    } catch (err) {
      console.error('[Metadata] OMDb fallback also failed:', err.message)
      throw err
    }
  }

  throw new Error('No metadata service configured. Add a TMDB or OMDb API key in Settings.')
}

// ── Discovery ──────────────────────────────────────────────

export async function getTrending(mediaType = 'all', timeWindow = 'week') {
  return withFallback(
    () => tmdb.getTrending(mediaType, timeWindow),
    async (useTrakt) => {
      if (useTrakt) {
        const t = mediaType === 'tv' ? 'tv' : 'movie'
        return traktDiscovery(`/${t === 'tv' ? 'shows' : 'movies'}/trending`, t)
      }
      return omdbFallbackPage(1, mediaType === 'tv' ? 'series' : 'movie')
    },
    true
  )
}

export async function getPopularMovies(page = 1) {
  return withFallback(
    () => tmdb.getPopularMovies(page),
    async (useTrakt) => {
      if (useTrakt) return traktDiscovery('/movies/popular', 'movie', page)
      return omdbFallbackPage(page, 'movie')
    },
    true
  )
}

export async function getTopRatedMovies(page = 1) {
  return withFallback(
    () => tmdb.getTopRatedMovies(page),
    async (useTrakt) => {
      if (useTrakt) return traktDiscovery('/movies/top_rated', 'movie', page)
      return omdbFallbackPage(page, 'movie')
    },
    true
  )
}

export async function getNowPlayingMovies(page = 1) {
  return withFallback(
    () => tmdb.getNowPlayingMovies(page),
    async (useTrakt) => {
      if (useTrakt) return traktDiscovery('/movies/trending', 'movie', page)
      return omdbFallbackPage(page, 'movie')
    },
    true
  )
}

export async function getUpcomingMovies(page = 1) {
  return withFallback(
    () => tmdb.getUpcomingMovies(page),
    async () => omdbFallbackPage(page, 'movie'),
    true
  )
}

export async function getPopularTV(page = 1) {
  return withFallback(
    () => tmdb.getPopularTV(page),
    async (useTrakt) => {
      if (useTrakt) return traktDiscovery('/shows/popular', 'tv', page)
      return omdbFallbackPage(page, 'series')
    },
    true
  )
}

export async function getTopRatedTV(page = 1) {
  return withFallback(
    () => tmdb.getTopRatedTV(page),
    async (useTrakt) => {
      if (useTrakt) return traktDiscovery('/shows/top_rated', 'tv', page)
      return omdbFallbackPage(page, 'series')
    },
    true
  )
}

export async function getOnTheAirTV(page = 1) {
  return withFallback(
    () => tmdb.getOnTheAirTV(page),
    async (useTrakt) => {
      if (useTrakt) return traktDiscovery('/shows/trending', 'tv', page)
      return omdbFallbackPage(page, 'series')
    },
    true
  )
}

export async function discoverByGenre(mediaType = 'movie', genreId, page = 1) {
  return withFallback(
    () => tmdb.discoverByGenre(mediaType, genreId, page),
    async (useTrakt) => {
      if (useTrakt) {
        const t = mediaType === 'tv' ? 'tv' : 'movie'
        return traktDiscovery(`/${t === 'tv' ? 'shows' : 'movies'}/popular`, t, page)
      }
      return omdbFallbackPage(page, mediaType === 'tv' ? 'series' : 'movie')
    },
    true
  )
}

// ── Search ────────────────────────────────────────────────
export async function discoverAnime(sortBy = 'popularity.desc', page = 1) {
  if (hasTmdbKey()) {
    return tmdb.discoverAnime(sortBy, page).catch(() => ({ results: [] }))
  }
  return Promise.resolve({ results: [] })
}

export async function searchMulti(query, page = 1) {
  if (hasTmdbKey()) {
    try {
      activeSource = 'tmdb'
      return await tmdb.searchMulti(query, page)
    } catch {
      // Fall through to OMDb
    }
  }

  if (!hasOmdbKey()) return { results: [], total_results: 0 }

  activeSource = 'omdb'
  // Search movies + series in parallel via OMDb, merge results
  const omdbApi = axios.create({ baseURL: 'https://www.omdbapi.com', timeout: 10000 })
  omdbApi.interceptors.response.use((r) => r.data, (e) => { throw e })
  const key = localStorage.getItem('sv_omdb_api_key')

  const [movieRes, seriesRes] = await Promise.allSettled([
    omdbApi.get('/', { params: { apikey: key, s: query, type: 'movie', page } }),
    omdbApi.get('/', { params: { apikey: key, s: query, type: 'series', page } })
  ])

  const results = []
  if (movieRes.status === 'fulfilled') results.push(...omdbSearchToResults(movieRes.value, 'movie').results)
  if (seriesRes.status === 'fulfilled') results.push(...omdbSearchToResults(seriesRes.value, 'tv').results)

  const seen = new Set()
  const deduped = results.filter((item) => {
    if (seen.has(item.imdb_id)) return false
    seen.add(item.imdb_id)
    return true
  })

  return { results: deduped, total_results: deduped.length }
}

// ── Details ────────────────────────────────────────────────
export async function getDetails(id, mediaType = 'movie') {
  if (hasTmdbKey()) {
    try {
      activeSource = 'tmdb'
      const result = await tmdb.getDetails(id, mediaType)

      // Optionally enhance backdrop with Fanart.tv
      if (hasFanartKey() && result.imdb_id) {
        try {
          const fanartData = await enrichWithFanart({ imdb_id: result.imdb_id, media_type: mediaType })
          if (fanartData?.backdrop_path && fanartData.backdrop_path !== result.backdrop_path) {
            result.backdrop_path = fanartData.backdrop_path
          }
        } catch { /* fanart optional */ }
      }

      return result
    } catch {
      // TMDB failed — fall through
    }
  }

  // OMDb fallback
  if (!hasOmdbKey()) throw new Error('No metadata service configured')

  activeSource = 'omdb'
  const idStr = String(id)
  if (!idStr.startsWith('tt')) {
    throw new Error('OMDb requires an IMDB ID (tt prefix)')
  }

  const omdbApi = axios.create({ baseURL: 'https://www.omdbapi.com', timeout: 10000 })
  omdbApi.interceptors.response.use((r) => r.data, (e) => { throw e })
  const cacheKey = `omdb_detail_${idStr}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const data = await omdbApi.get('/', {
    params: { apikey: localStorage.getItem('sv_omdb_api_key'), i: idStr, plot: 'full' }
  })
  if (data.Response === 'False') throw new Error(data.Error || 'Not found')

  await enrichWithFanart(data)
  const shaped = toTmdbShape(data, mediaType)

  if (data.Actors && data.Actors !== 'N/A') {
    shaped.credits = {
      cast: data.Actors.split(', ').map((name, i) => ({
        id: `cast_${i}`, name, character: '', profile_path: null
      })).slice(0, 12)
    }
  }

  setCache(cacheKey, shaped)
  return shaped
}

export async function getCredits(id, mediaType = 'movie') {
  if (hasTmdbKey()) {
    try {
      return await tmdb.getCredits(id, mediaType)
    } catch {
      // fall through
    }
  }
  // OMDb has no credits endpoint — fall back to details
  try {
    const details = await getDetails(id, mediaType)
    return { cast: details.credits?.cast || [], crew: [] }
  } catch {
    return { cast: [], crew: [] }
  }
}

export function getVideos(id, mediaType = 'movie') {
  if (hasTmdbKey()) {
    return tmdb.getVideos(id, mediaType).catch(() => ({ results: [] }))
  }
  return Promise.resolve({ results: [] })
}

export function getSimilar(id, mediaType = 'movie') {
  if (hasTmdbKey()) {
    return tmdb.getSimilar(id, mediaType).catch(() => ({ results: [] }))
  }
  return Promise.resolve({ results: [] })
}

// ── External ID lookup ────────────────────────────────────
export async function lookupByExternalId(imdbId, source = 'imdb_id') {
  if (hasTmdbKey()) {
    try {
      return await tmdb.lookupByExternalId(imdbId, source)
    } catch {
      // fall through
    }
  }
  // OMDb fallback
  if (!imdbId || !String(imdbId).startsWith('tt')) return null
  try {
    const data = await getDetails(imdbId, 'movie')
    return data || null
  } catch {
    return null
  }
}

// ── Image URL helpers ─────────────────────────────────────
// TMDB returns relative paths (e.g. "/abc123.jpg") — construct full URL.
// OMDb/Fanart return full URLs — pass through as-is.

export function getPosterUrl(path, size = 'medium') {
  if (!path) return PLACEHOLDER_IMAGE
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path
  }
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES.poster[size]}${path}`
}

export function getBackdropUrl(path, size = 'large') {
  if (!path) return null
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path
  }
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES.backdrop[size]}${path}`
}

export function getProfileUrl(path, size = 'medium') {
  if (!path) return null
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path
  }
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES.profile[size]}${path}`
}

// ── Key validators ────────────────────────────────────────
export const validateApiKey     = tmdb.validateApiKey
export const validateOmdbKey   = omdb.validateOmdbKey
export const validateFanartKey = tmdb_validateFanartKey
export const validateTraktKey  = tmdb_validateTraktKey

// ── Inline Fanart.tv key validation ───────────────────────
async function tmdb_validateFanartKey(key) {
  try {
    const res = await axios.get(`${FANART_BASE_URL}/movies/tt1375666`, {
      params: { api_key: key },
      headers: { 'api-key': key },
      timeout: 8000,
      validateStatus: () => true
    })
    if (res.status === 200 && !res.data?.error && res.data?.id) return true
    if (res.status === 401 || res.status === 403) return false
    return false
  } catch {
    return false
  }
}

// ── Inline Trakt.tv key validation ────────────────────────
async function tmdb_validateTraktKey(clientId) {
  try {
    const data = await axios.get('https://api.trakt.tv/movies/trending', {
      headers: {
        'Content-Type': 'application/json',
        'trakt-api-version': '2',
        'trakt-api-key': clientId
      },
      timeout: 5000
    })
    return Array.isArray(data.data)
  } catch {
    return false
  }
}
