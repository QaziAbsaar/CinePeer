import axios from 'axios'
import { YTS_BASE_URL, buildMagnetUri } from '../utils/constants'

const yts = axios.create({
  baseURL: YTS_BASE_URL,
  timeout: 15000
})

yts.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[YTS]', error.response?.status, error.message)
    throw error
  }
)

/**
 * List movies with filtering and sorting.
 * @param {Object} params
 * @param {string} [params.query] - Search query
 * @param {string} [params.genre] - Genre filter (e.g. 'action')
 * @param {number} [params.minimum_rating] - Minimum IMDb rating (0-9)
 * @param {string} [params.quality] - Quality filter ('720p', '1080p', '2160p', '3D')
 * @param {string} [params.sort_by] - Sort field ('date_added','rating','year','title','seeds','download_count','like_count')
 * @param {string} [params.order_by] - 'desc' or 'asc'
 * @param {number} [params.page] - Page number
 * @param {number} [params.limit] - Results per page (1-50, default 20)
 */
export async function listMovies(params = {}) {
  const response = await yts.get('/list_movies.json', { params })
  const { movie_count, limit, page_number, movies } = response.data

  // Enrich torrents with magnet URIs
  const enrichedMovies = (movies || []).map(movie => ({
    ...movie,
    torrents: (movie.torrents || []).map(torrent => ({
      ...torrent,
      magnet_url: buildMagnetUri(torrent.hash, movie.title_long || movie.title)
    }))
  }))

  return {
    movieCount: movie_count,
    limit,
    page: page_number,
    movies: enrichedMovies
  }
}

/**
 * Get full movie details including all available torrents.
 * @param {number} movieId - YTS movie ID
 */
export async function getMovieDetails(movieId) {
  const response = await yts.get('/movie_details.json', {
    params: { movie_id: movieId, with_cast: true, with_images: true }
  })

  const movie = response.data.movie
  if (movie && movie.torrents) {
    movie.torrents = movie.torrents.map(torrent => ({
      ...torrent,
      magnet_url: buildMagnetUri(torrent.hash, movie.title_long || movie.title)
    }))
  }

  return movie
}

/**
 * Get movie suggestions based on a movie.
 * @param {number} movieId - YTS movie ID
 */
export async function getMovieSuggestions(movieId) {
  const response = await yts.get('/movie_suggestions.json', {
    params: { movie_id: movieId }
  })
  return response.data.movies || []
}

/**
 * Search YTS by IMDB ID to find torrents for a TMDB movie.
 * @param {string} imdbId - IMDB ID (e.g. 'tt1234567')
 */
export async function searchByImdbId(imdbId) {
  const response = await yts.get('/list_movies.json', {
    params: { query_term: imdbId }
  })

  const movies = response.data.movies || []
  if (movies.length === 0) return null

  const movie = movies[0]
  if (movie.torrents) {
    movie.torrents = movie.torrents.map(torrent => ({
      ...torrent,
      magnet_url: buildMagnetUri(torrent.hash, movie.title_long || movie.title)
    }))
  }

  return movie
}
