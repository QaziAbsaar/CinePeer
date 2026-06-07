import { searchByImdbId as ytsSearchByImdb } from './yts'
import { getTorrents as eztvGetTorrents } from './eztv'
import { searchByImdbId as tpbSearchByImdb } from './tpb'
import { searchByImdbId as thirteenSearchByImdb } from './1337x'

function dedupTorrents(list) {
  const seen = new Set()
  return list.filter(t => {
    const key = t.hash || t.magnet_url || t.id
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Search movie torrents from YTS + TPB + 1337x.
 * Results merged, deduped by hash, sorted by seeds desc.
 */
export async function searchMovieTorrents(imdbId) {
  const [ytsRes, tpbRes, thirteenRes] = await Promise.allSettled([
    ytsSearchByImdb(imdbId),
    tpbSearchByImdb(imdbId, 'movie'),
    thirteenSearchByImdb(imdbId, 'movie')
  ])

  const ytsTorrents = ytsRes.status === 'fulfilled' && ytsRes.value
    ? (ytsRes.value.torrents || []).map(t => ({ ...t, source: 'yts' }))
    : []

  let tpbTorrents = tpbRes.status === 'fulfilled' ? tpbRes.value : []
  tpbTorrents = tpbTorrents.map(t => ({ ...t, source: 'tpb' }))

  let thirteenTorrents = thirteenRes.status === 'fulfilled' ? thirteenRes.value : []
  thirteenTorrents = thirteenTorrents.map(t => ({ ...t, source: '1337x' }))

  const merged = dedupTorrents([...ytsTorrents, ...tpbTorrents, ...thirteenTorrents])
  return merged.sort((a, b) => (b.seeds || 0) - (a.seeds || 0))
}

/**
 * Search TV torrents from EZTV + TPB + 1337x.
 * Results merged, deduped by hash, sorted by seeds desc.
 */
export async function searchTvTorrents(imdbId) {
  const [eztvRes, tpbRes, thirteenRes] = await Promise.allSettled([
    eztvGetTorrents({ imdbId }),
    tpbSearchByImdb(imdbId, 'tv'),
    thirteenSearchByImdb(imdbId, 'tv')
  ])

  let eztvTorrents = eztvRes.status === 'fulfilled' && eztvRes.value
    ? (eztvRes.value.torrents || []).map(t => ({ ...t, source: 'eztv' }))
    : []

  let tpbTorrents = tpbRes.status === 'fulfilled' ? tpbRes.value : []
  tpbTorrents = tpbTorrents.map(t => ({ ...t, source: 'tpb' }))

  let thirteenTorrents = thirteenRes.status === 'fulfilled' ? thirteenRes.value : []
  thirteenTorrents = thirteenTorrents.map(t => ({ ...t, source: '1337x' }))

  const merged = dedupTorrents([...eztvTorrents, ...tpbTorrents, ...thirteenTorrents])
  return merged.sort((a, b) => (b.seeds || 0) - (a.seeds || 0))
}
