/**
 * Metadata service — uses OMDb API for text metadata + Fanart.tv for images.
 *
 * OMDb: https://www.omdbapi.com
 * Fanart.tv: https://webservice.fanart.tv/v3
 *
 * All exports match the original TMDB service signatures so consumers
 * (pages, components) require zero changes.
 */

import axios from 'axios'
import { FANART_BASE_URL, PLACEHOLDER_IMAGE } from '../utils/constants'
import { getCached, setCache } from '../utils/cache'

// ── API Keys ───────────────────────────────────────────────
function getOmdbKey() {
  return localStorage.getItem('sv_omdb_api_key') || ''
}

function getFanartKey() {
  return localStorage.getItem('sv_fanart_api_key') || ''
}

// ── OMDb Axios instance ────────────────────────────────────
const omdbApi = axios.create({
  baseURL: 'https://www.omdbapi.com',
  timeout: 10000
})

omdbApi.interceptors.response.use(
  (r) => r.data,
  (error) => {
    console.error('[OMDb]', error.response?.status, error.message)
    throw error
  }
)

// ── Fanart.tv Axios instance ───────────────────────────────
const fanartApi = axios.create({
  baseURL: FANART_BASE_URL,
  timeout: 8000
})

fanartApi.interceptors.response.use(
  (r) => r.data,
  (error) => {
    console.warn('[Fanart.tv]', error.response?.status, error.message)
    // Do NOT throw — Fanart is optional enrichment
    return null
  }
)

// ── Cached fetch wrapper ───────────────────────────────────
async function cachedFetch(cacheKey, fetchFn) {
  const cached = getCached(cacheKey)
  if (cached) return cached
  const data = await fetchFn()
  setCache(cacheKey, data)
  return data
}

// ── Helpers ────────────────────────────────────────────────

/** Normalise a single OMDb item to the TMDB-consumable shape the UI expects. */
function toTmdbShape(omdbItem, mediaType) {
  const isMovie = mediaType === 'movie' || omdbItem.Type === 'movie'
  const rating = parseFloat(omdbItem.imdbRating) || 0
  const poster = omdbItem.Poster && omdbItem.Poster !== 'N/A' ? omdbItem.Poster : null
  const backdrop = omdbItem._fanart_background || null
  const fanartPoster = omdbItem._fanart_poster || null

  return {
    id: omdbItem.imdbID || `omdb_${Date.now()}`,
    imdb_id: omdbItem.imdbID,
    title: isMovie ? omdbItem.Title : undefined,
    name: !isMovie ? omdbItem.Title : undefined,
    poster_path: fanartPoster || poster,           // prefer Fanart, fall back to OMDb
    backdrop_path: backdrop,                       // Fanart only
    vote_average: rating,
    vote_count: parseInt(omdbItem.imdbVotes?.replace(/,/g, '')) || 0,
    release_date: isMovie && omdbItem.Year ? omdbItem.Year + '-01-01' : undefined,
    first_air_date: !isMovie && omdbItem.Year ? omdbItem.Year + '-01-01' : undefined,
    overview: omdbItem.Plot && omdbItem.Plot !== 'N/A' ? omdbItem.Plot : '',
    genre_ids: [],                                 // OMDb gives genre as string, not IDs
    genre_names: omdbItem.Genre ? omdbItem.Genre.split(', ').filter(Boolean) : [],
    media_type: mediaType || (isMovie ? 'movie' : 'tv'),
    original_language: omdbItem.Language?.split(', ')?.[0]?.toLowerCase() || 'en',
    popularity: 0,
    // OMDb extras
    rated: omdbItem.Rated,
    runtime: omdbItem.Runtime,
    actors: omdbItem.Actors,
    director: omdbItem.Director,
    writer: omdbItem.Writer,
    ratings: omdbItem.Ratings || [],
    metascore: omdbItem.Metascore,
    awards: omdbItem.Awards,
    box_office: omdbItem.BoxOffice,
    country: omdbItem.Country,
    production: omdbItem.Production
  }
}

/** Convert OMDb search results (movie + series merged) into TMDB-shaped results object. */
function omdbSearchToResults(data, mediaType) {
  if (!data || data.Response !== 'True') return { results: [], total_results: 0 }
  const items = data.Search || []
  const mapped = items.map((item) => toTmdbShape(item, mediaType || item.Type))
  return { results: mapped, total_results: mapped.length }
}

/**
 * Enrich a single OMDb item with Fanart.tv images (poster + background).
 * Mutates and returns the item (adds _fanart_poster, _fanart_background).
 */
async function enrichWithFanart(item) {
  const fanartKey = getFanartKey()
  const imdbId = item?.imdbID
  if (!fanartKey || !imdbId) return item

  const isMovie = item.Type === 'movie'
  const cacheKey = `fanart_${imdbId}`
  let fanartData = getCached(cacheKey)

  if (!fanartData) {
    try {
      const endpoint = isMovie ? `/movies/${imdbId}` : `/tv/${imdbId}`
      fanartData = await fanartApi.get(endpoint, { params: { api_key: fanartKey } })
      if (fanartData) setCache(cacheKey, fanartData)
    } catch {
      fanartData = null
    }
  }

  if (fanartData) {
    const posters = fanartData.movieposter || fanartData.tvposter || []
    const backgrounds = fanartData.moviebackground || fanartData.tvbackground || []
    if (posters.length > 0) item._fanart_poster = posters.sort((a, b) => b.likes - a.likes)[0].url
    if (backgrounds.length > 0) item._fanart_background = backgrounds.sort((a, b) => b.likes - a.likes)[0].url
  }

  return item
}

// ── Discovery (keyword-based — OMDb has no trending/genre endpoints) ──

const MOVIE_KEYWORDS = ['avengers', 'inception', 'matrix', 'dark', 'fast', 'rings', 'pirates', 'bourne', 'mission', 'jurassic']
const TV_KEYWORDS    = ['breaking', 'game', 'stranger', 'sherlock', 'friends', 'simpsons', 'office', 'crown', 'mandalorian', 'witcher']

async function searchByKeyword(keyword, page = 1, type = 'movie') {
  const key = getOmdbKey()
  if (!key) return { results: [], total_results: 0 }
  const cacheKey = `omdb_search_${type}_${keyword}_${page}`
  return cachedFetch(cacheKey, async () => {
    const data = await omdbApi.get('/', { params: { apikey: key, s: keyword, type, page } })
    return omdbSearchToResults(data, type)
  })
}

async function discoverPage(page = 1, type = 'movie') {
  const pool = type === 'series' || type === 'tv' ? TV_KEYWORDS : MOVIE_KEYWORDS
  const idx = Math.min(page - 1, pool.length - 1)
  return searchByKeyword(pool[idx], 1, type)
}

// ── Exported API (matches original TMDB service signatures) ──

export async function getTrending(mediaType = 'all', timeWindow = 'week') {
  return discoverPage(1, mediaType === 'tv' ? 'tv' : 'movie')
}

export async function getPopularMovies(page = 1) {
  return discoverPage(page, 'movie')
}

export async function getTopRatedMovies(page = 1) {
  return discoverPage(page, 'movie')
}

export async function getNowPlayingMovies(page = 1) {
  return discoverPage(page, 'movie')
}

export async function getUpcomingMovies(page = 1) {
  return searchByKeyword('2025', page, 'movie')
}

export async function getPopularTV(page = 1) {
  return discoverPage(page, 'series')
}

export async function getTopRatedTV(page = 1) {
  return discoverPage(page, 'series')
}

export async function getOnTheAirTV(page = 1) {
  return discoverPage(page, 'series')
}

export async function discoverByGenre(mediaType = 'movie', genreId, page = 1) {
  // OMDb has no genre filtering — return generic discovery results
  return discoverPage(page, mediaType === 'tv' ? 'series' : 'movie')
}

// ── Search ────────────────────────────────────────────────
export async function searchMulti(query, page = 1) {
  const key = getOmdbKey()
  if (!key) return { results: [], total_results: 0 }

  // Search movies + series in parallel, merge results
  const [movieRes, seriesRes] = await Promise.allSettled([
    omdbApi.get('/', { params: { apikey: key, s: query, type: 'movie', page } }),
    omdbApi.get('/', { params: { apikey: key, s: query, type: 'series', page } })
  ])

  const results = []
  if (movieRes.status === 'fulfilled') results.push(...omdbSearchToResults(movieRes.value, 'movie').results)
  if (seriesRes.status === 'fulfilled') results.push(...omdbSearchToResults(seriesRes.value, 'tv').results)

  // Deduplicate by IMDB ID
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
  const key = getOmdbKey()
  if (!key) throw new Error('OMDb API key not configured')

  const cacheKey = `omdb_detail_${id}`
  return cachedFetch(cacheKey, async () => {
    const idStr = String(id)
    const params = { apikey: key, plot: 'full' }
    if (idStr.startsWith('tt')) {
      params.i = idStr
    } else {
      params.i = idStr
    }

    const data = await omdbApi.get('/', { params })
    if (data.Response === 'False') throw new Error(data.Error || 'Not found')

    // Enrich with Fanart.tv images
    await enrichWithFanart(data)

    const shaped = toTmdbShape(data, mediaType)

    // Parse credits from OMDb Actors field
    if (data.Actors && data.Actors !== 'N/A') {
      const cast = data.Actors.split(', ').map((name, i) => ({
        id: `cast_${i}`,
        name,
        character: '',
        profile_path: null
      })).slice(0, 12)
      shaped.credits = { cast }
    }

    return shaped
  })
}

export async function getCredits(id, mediaType = 'movie') {
  // OMDb has no separate credits endpoint — details include Actors
  try {
    const details = await getDetails(id, mediaType)
    return { cast: details.credits?.cast || [], crew: [] }
  } catch {
    return { cast: [], crew: [] }
  }
}

export function getVideos(id, mediaType = 'movie') {
  // OMDb has no trailer/video data
  return Promise.resolve({ results: [] })
}

export function getSimilar(id, mediaType = 'movie') {
  // OMDb has no similar/recommendation endpoint
  return Promise.resolve({ results: [] })
}

// ── External ID lookup ────────────────────────────────────
export async function lookupByExternalId(imdbId, source = 'imdb_id') {
  if (!imdbId || !String(imdbId).startsWith('tt')) return null
  try {
    const data = await getDetails(imdbId, 'movie')
    return data || null
  } catch {
    return null
  }
}

// ── Image URL helpers ─────────────────────────────────────
// OMDb + Fanart.tv return full URLs, so these are mostly identity functions.

export function getPosterUrl(path, size = 'medium') {
  if (!path) return PLACEHOLDER_IMAGE
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path
  }
  // If somehow a relative path leaks through, return placeholder
  return PLACEHOLDER_IMAGE
}

export function getBackdropUrl(path, size = 'large') {
  if (!path) return null
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path
  }
  return null
}

export function getProfileUrl(path, size = 'medium') {
  // OMDb has no profile photos — return placeholder
  return null
}

// ── Key validation ────────────────────────────────────────
export async function validateApiKey(key) {
  // Validate OMDb key
  try {
    const data = await omdbApi.get('/', {
      params: { apikey: key, i: 'tt1375666', plot: 'short' }
    })
    return data.Response === 'True'
  } catch {
    return false
  }
}

export async function validateOmdbKey(key) {
  return validateApiKey(key)
}

export async function validateFanartKey(key) {
  try {
    const data = await fanartApi.get('/movies/tt1375666', { params: { api_key: key } })
    return data !== null && !data.error
  } catch {
    return false
  }
}

// ── Active source (kept for backward compat) ──────────────
export function getActiveSource() { return 'omdb' }
export function isUsingOmdb() { return true }
