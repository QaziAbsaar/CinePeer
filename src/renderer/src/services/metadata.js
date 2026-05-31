/**
 * Unified metadata resolver.
 * Tries TMDB first. Falls back to OMDB when TMDB key is missing or calls fail.
 *
 * All pages use THIS service instead of importing tmdb.js directly.
 * When your TMDB account is verified, the app auto-switches back.
 */

import * as tmdb from './tmdb'
import * as omdb from './omdb'

// ── Active source tracking ─────────────────────────────────
let activeSource = 'tmdb' // 'tmdb' | 'omdb'

export function getActiveSource() { return activeSource }
export function isUsingOmdb() { return activeSource === 'omdb' }

// ── Source check ────────────────────────────────────────────
function hasTmdbKey() {
  return !!(localStorage.getItem('sv_tmdb_api_key') || import.meta.env.VITE_TMDB_API_KEY)
}

function hasOmdbKey() {
  return !!localStorage.getItem('sv_omdb_api_key')
}

// ── Fallback helper ────────────────────────────────────────
async function withFallback(tmdbFn, omdbFn) {
  if (hasTmdbKey()) {
    try {
      const result = await tmdbFn()
      if (result) {
        activeSource = 'tmdb'
        return result
      }
    } catch {
      // TMDB failed — fall through to OMDB
    }
  }

  if (hasOmdbKey()) {
    activeSource = 'omdb'
    try {
      return await omdbFn()
    } catch (err) {
      console.error('[Metadata] OMDB fallback also failed:', err.message)
      throw err
    }
  }

  throw new Error('No metadata service configured. Add a TMDB or OMDB API key in Settings.')
}

// ── Public API — mirrors tmdb.js exports ───────────────────

export async function getTrending(mediaType = 'all', timeWindow = 'week') {
  return withFallback(
    () => tmdb.getTrending(mediaType, timeWindow),
    () => omdb.searchOmdb('2024', 1) // OMDB has no trending — show recent movies
  )
}

export async function getPopularMovies(page = 1) {
  return withFallback(
    () => tmdb.getPopularMovies(page),
    () => omdb.searchOmdb('2024', page)
  )
}

export async function getTopRatedMovies(page = 1) {
  return withFallback(
    () => tmdb.getTopRatedMovies(page),
    () => omdb.searchOmdb('2024', page)
  )
}

export async function getNowPlayingMovies(page = 1) {
  return withFallback(
    () => tmdb.getNowPlayingMovies(page),
    () => omdb.searchOmdb('2024', page)
  )
}

export async function getUpcomingMovies(page = 1) {
  return withFallback(
    () => tmdb.getUpcomingMovies(page),
    () => omdb.searchOmdb('2025', page)
  )
}

export async function getPopularTV(page = 1) {
  return withFallback(
    () => tmdb.getPopularTV(page),
    () => omdb.searchOmdb('2024', 1) // Same limitation — OMDB has no TV discovery
  )
}

export async function getTopRatedTV(page = 1) {
  return withFallback(
    () => tmdb.getTopRatedTV(page),
    () => omdb.searchOmdb('2024', 1)
  )
}

export async function getOnTheAirTV(page = 1) {
  return withFallback(
    () => tmdb.getOnTheAirTV(page),
    () => omdb.searchOmdb('2024', 1)
  )
}

export async function discoverByGenre(mediaType, genreId, page = 1) {
  return withFallback(
    () => tmdb.discoverByGenre(mediaType, genreId, page),
    () => omdb.searchOmdb('2024', page)
  )
}

export async function searchMulti(query, page = 1) {
  return withFallback(
    () => tmdb.searchMulti(query, page),
    () => omdb.searchOmdb(query, page)
  )
}

export async function getDetails(id, mediaType = 'movie') {
  return withFallback(
    () => tmdb.getDetails(id, mediaType),
    async () => {
      // OMDB needs IMDB ID, not TMDB ID
      // Try to find IMDB ID via search first
      const idStr = String(id)
      if (idStr.startsWith('tt')) {
        return await omdb.getOmdbDetails(idStr)
      }
      throw new Error('OMDB requires an IMDB ID (tt prefix)')
    }
  )
}

export async function getCredits(id, mediaType = 'movie') {
  return withFallback(
    () => tmdb.getCredits(id, mediaType),
    () => ({ cast: [], crew: [] }) // OMDB has no cast endpoint beyond what details already gives
  )
}

export async function getVideos(id, mediaType = 'movie') {
  return withFallback(
    () => tmdb.getVideos(id, mediaType),
    () => ({ results: [] }) // OMDB has no trailers
  )
}

export async function getSimilar(id, mediaType = 'movie') {
  return withFallback(
    () => tmdb.getSimilar(id, mediaType),
    () => ({ results: [] }) // OMDB has no similar
  )
}

export async function lookupByExternalId(imdbId, source = 'imdb_id') {
  return withFallback(
    () => tmdb.lookupByExternalId(imdbId, source),
    () => omdb.getOmdbDetails(imdbId).then(d => d || null)
  )
}

// ── Image helpers (delegate to TMDB or OMDB) ───────────────
export function getPosterUrl(path, size = 'medium') {
  // With OMDB, path is already a full URL — use it directly
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path
  }
  return tmdb.getPosterUrl(path, size)
}

export function getBackdropUrl(path, size = 'large') {
  return tmdb.getBackdropUrl(path, size)
}

export function getProfileUrl(path, size = 'medium') {
  return tmdb.getProfileUrl(path, size)
}

export { validateApiKey } from './tmdb'
export { validateOmdbKey } from './omdb'
