/**
 * Metadata resolver — delegates everything to the unified OMDb + Fanart.tv service.
 *
 * All pages import from THIS file instead of importing tmdb.js directly.
 * This file exists so consumers don't need to change if the underlying
 * provider changes in the future.
 */

import * as service from './tmdb'

// Re-export every function the UI expects
export const getTrending         = service.getTrending
export const getPopularMovies    = service.getPopularMovies
export const getTopRatedMovies   = service.getTopRatedMovies
export const getNowPlayingMovies = service.getNowPlayingMovies
export const getUpcomingMovies   = service.getUpcomingMovies
export const getPopularTV        = service.getPopularTV
export const getTopRatedTV       = service.getTopRatedTV
export const getOnTheAirTV       = service.getOnTheAirTV
export const discoverByGenre     = service.discoverByGenre
export const searchMulti         = service.searchMulti
export const getDetails          = service.getDetails
export const getCredits          = service.getCredits
export const getVideos           = service.getVideos
export const getSimilar          = service.getSimilar
export const lookupByExternalId  = service.lookupByExternalId
export const getPosterUrl        = service.getPosterUrl
export const getBackdropUrl      = service.getBackdropUrl
export const getProfileUrl       = service.getProfileUrl
export const validateApiKey      = service.validateApiKey
export const validateOmdbKey     = service.validateOmdbKey
export const validateFanartKey   = service.validateFanartKey
export const validateTraktKey    = service.validateTraktKey
export const getActiveSource     = service.getActiveSource
export const isUsingOmdb         = service.isUsingOmdb
