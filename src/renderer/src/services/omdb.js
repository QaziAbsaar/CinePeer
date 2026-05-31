/**
 * OMDB API client — temporary fallback when TMDB API key is unavailable.
 *
 * OMDB is much more limited than TMDB:
 * - Search only (no trending, popular, or genre discovery)
 * - No backdrop images (Poster only)
 * - No cast photos (names only)
 * - Max 10 results per page, 100 total
 *
 * Once you have a TMDB API key, this service is bypassed.
 *
 * Get a free key at: https://www.omdbapi.com/apikey.aspx
 */

import axios from 'axios'
import { getCached, setCache } from '../utils/cache'

const OMDB_BASE_URL = 'https://www.omdbapi.com'

let _apiKey = ''

export function setOmdbApiKey(key) {
  _apiKey = key
}

function getKey() {
  return _apiKey || localStorage.getItem('sv_omdb_api_key') || ''
}

const omdb = axios.create({
  baseURL: OMDB_BASE_URL,
  timeout: 10000
})

omdb.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[OMDB]', error.response?.status, error.message)
    throw error
  }
}

/**
 * Map an OMDB movie/series object to TMDB-compatible shape.
 */
function toTmdbShape(omdbItem, mediaType) {
  const isMovie = mediaType === 'movie' || omdbItem.Type === 'movie'
  const rating = parseFloat(omdbItem.imdbRating) || 0

  return {
    id: omdbItem.imdbID || `omdb_${Date.now()}`,
    imdb_id: omdbItem.imdbID,
    title: isMovie ? omdbItem.Title : undefined,
    name: !isMovie ? omdbItem.Title : undefined,
    poster_path: omdbItem.Poster && omdbItem.Poster !== 'N/A'
      ? omdbItem.Poster  // OMDB returns full URL, not a path
      : null,
    backdrop_path: null, // OMDB has no backdrops
    vote_average: rating,
    vote_count: parseInt(omdbItem.imdbVotes?.replace(/,/g, '')) || 0,
    release_date: isMovie ? omdbItem.Year + '-01-01' : undefined,
    first_air_date: !isMovie ? omdbItem.Year + '-01-01' : undefined,
    overview: omdbItem.Plot && omdbItem.Plot !== 'N/A' ? omdbItem.Plot : '',
    genre_ids: [], // OMDB gives genre as string, not IDs
    genre_names: omdbItem.Genre ? omdbItem.Genre.split(', ').filter(Boolean) : [],
    media_type: mediaType || (isMovie ? 'movie' : 'tv'),
    original_language: omdbItem.Language?.split(', ')?.[0]?.toLowerCase() || 'en',
    popularity: 0,
    // OMDB extras
    rated: omdbItem.Rated,
    runtime: omdbItem.Runtime,
    actors: omdbItem.Actors,
    director: omdbItem.Director,
    writer: omdbItem.Writer,
    ratings: omdbItem.Ratings || [], // [{Source: "Internet Movie Database", Value: "8.5/10"}]
    metascore: omdbItem.Metascore,
    awards: omdbItem.Awards,
    box_office: omdbItem.BoxOffice,
    country: omdbItem.Country,
    production: omdbItem.Production,
    website: omdbItem.Website
  }
}

/**
 * Search for movies and TV shows.
 * OMDB search is single-type only — we do two searches and merge.
 */
export async function searchOmdb(query, page = 1) {
  const key = getKey()
  if (!key) throw new Error('OMDB API key not configured')

  const cacheKey = `omdb_search_${query}_${page}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  // Search movies and series separately (OMDB doesn't support multi-search)
  const [movieRes, seriesRes] = await Promise.allSettled([
    omdb.get('/', { params: { apikey: key, s: query, type: 'movie', page } }),
    omdb.get('/', { params: { apikey: key, s: query, type: 'series', page } })
  ])

  const results = []

  if (movieRes.status === 'fulfilled' && movieRes.value.Response === 'True') {
    const movies = movieRes.value.Search || []
    results.push(...movies.map(m => toTmdbShape(m, 'movie')))
  }

  if (seriesRes.status === 'fulfilled' && seriesRes.value.Response === 'True') {
    const series = seriesRes.value.Search || []
    results.push(...series.map(s => toTmdbShape(s, 'tv')))
  }

  // Deduplicate by IMDB ID
  const seen = new Set()
  const deduped = results.filter(item => {
    if (seen.has(item.imdb_id)) return false
    seen.add(item.imdb_id)
    return true
  })

  const output = { results: deduped, total_results: deduped.length }
  setCache(cacheKey, output)
  return output
}

/**
 * Get full details for a title by IMDB ID.
 */
export async function getOmdbDetails(imdbId) {
  const key = getKey()
  if (!key) throw new Error('OMDB API key not configured')

  const cacheKey = `omdb_details_${imdbId}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const data = await omdb.get('/', {
    params: { apikey: key, i: imdbId, plot: 'full' }
  })

  if (data.Response === 'False') {
    throw new Error(data.Error || 'Not found')
  }

  const mediaType = data.Type === 'series' ? 'tv' : 'movie'
  const shaped = toTmdbShape(data, mediaType)

  // Add cast from Actors field
  if (data.Actors && data.Actors !== 'N/A') {
    shaped.credits = {
      cast: data.Actors.split(', ').map((name, i) => ({
        id: `omdb_cast_${i}`,
        name,
        character: '',
        profile_path: null
      })).slice(0, 12)
    }
  }

  setCache(cacheKey, shaped)
  return shaped
}

/**
 * Validate an OMDB API key.
 */
export async function validateOmdbKey(key) {
  try {
    const data = await omdb.get('/', {
      params: { apikey: key, i: 'tt1375666', plot: 'short' }
    })
    return data.Response === 'True'
  } catch {
    return false
  }
}

/**
 * Get poster URL from OMDB.
 * OMDB returns full URLs directly, no size variants.
 */
export function getOmdbPosterUrl(posterPath) {
  if (!posterPath) return null
  // If it's already a full URL, return as-is
  if (posterPath.startsWith('http')) return posterPath
  return null
}
