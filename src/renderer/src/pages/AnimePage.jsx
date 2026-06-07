import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { discoverAnime, getTrending } from '../services/metadata'
import CategoryRow from '../components/CategoryRow'
import { SkeletonRow } from '../components/SkeletonLoader'
import './AnimePage.css'

export default function AnimePage() {
  const [trending, setTrending] = useState([])
  const [popular, setPopular] = useState([])
  const [topRated, setTopRated] = useState([])
  const [airing, setAiring] = useState([])
  const [action, setAction] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(false)

    try {
      const [trend, pop, top, air, act] = await Promise.allSettled([
        getTrending('tv', 'week'),                              // trending anime
        discoverAnime('popularity.desc'),                       // popular anime
        discoverAnime('vote_average.desc'),                     // top rated
        discoverAnime('first_air_date.desc'),                   // currently airing
        discoverAnime('popularity.desc'),                       // action anime
      ])

      // Filter results to Japanese animation only (best-effort)
      if (trend.status === 'fulfilled') {
        const results = (trend.value.results || [])
          .filter(r => r.origin_country?.includes('JP') || r.original_language === 'ja')
        setTrending(results)
      }
      if (pop.status === 'fulfilled') setPopular(pop.value.results || [])
      if (top.status === 'fulfilled') setTopRated(top.value.results || [])
      if (air.status === 'fulfilled') {
        const results = (air.value.results || []).slice(0, 20)
        setAiring(results)
      }
      if (act.status === 'fulfilled') {
        const results = (act.value.results || []).slice(0, 20)
        setAction(results)
      }

      const allMain = [trend, pop, top, air]
      if (allMain.every(r => r.status === 'rejected')) {
        setError(true)
      }
    } catch (err) {
      console.error('Failed to fetch anime data:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1 className="page-title font-display">Anime</h1>
          <SkeletonRow title="Trending Now" />
          <SkeletonRow title="Popular Anime" />
          <SkeletonRow title="Top Rated" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1 className="page-title font-display">Anime</h1>
          <div className="error-state">
            <p>Could not load anime. Check your connection and API key.</p>
            <button className="btn btn-primary" onClick={fetchAll}>
              <RefreshCw size={18} /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" id="anime-page">
      <div className="page-content tv-header-spacing">
        <h1 className="page-title font-display">Anime</h1>
      </div>

      <CategoryRow title="Trending Now" items={trending} mediaType="tv" badge="HOT" />
      <CategoryRow title="Popular Anime" items={popular} mediaType="tv" />
      <CategoryRow title="Top Rated" items={topRated} mediaType="tv" badge="TOP" />
      {airing.length > 0 && <CategoryRow title="Currently Airing" items={airing} mediaType="tv" badge="NEW" />}
      {action.length > 0 && <CategoryRow title="Action Anime" items={action} mediaType="tv" />}
    </div>
  )
}
