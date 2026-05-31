import { useState, useEffect } from 'react'
import { getPopularTV, getTopRatedTV, getOnTheAirTV, discoverByGenre } from '../services/tmdb'
import CategoryRow from '../components/CategoryRow'
import { SkeletonRow } from '../components/SkeletonLoader'
import './TVShowsPage.css'

export default function TVShowsPage() {
  const [popularTV, setPopularTV] = useState([])
  const [topRatedTV, setTopRatedTV] = useState([])
  const [onTheAir, setOnTheAir] = useState([])
  const [sciFiTV, setSciFiTV] = useState([])
  const [crimeTV, setCrimeTV] = useState([])
  const [dramaTV, setDramaTV] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [popular, topRated, airing, sciFi, crime, drama] = await Promise.allSettled([
          getPopularTV(),
          getTopRatedTV(),
          getOnTheAirTV(),
          discoverByGenre('tv', 10765), // Sci-Fi & Fantasy
          discoverByGenre('tv', 80),    // Crime
          discoverByGenre('tv', 18)     // Drama
        ])

        if (popular.status === 'fulfilled') setPopularTV(popular.value.results || [])
        if (topRated.status === 'fulfilled') setTopRatedTV(topRated.value.results || [])
        if (airing.status === 'fulfilled') setOnTheAir(airing.value.results || [])
        if (sciFi.status === 'fulfilled') setSciFiTV(sciFi.value.results || [])
        if (crime.status === 'fulfilled') setCrimeTV(crime.value.results || [])
        if (drama.status === 'fulfilled') setDramaTV(drama.value.results || [])
      } catch (err) {
        console.error('Failed to fetch TV data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-content">
          <h1 className="page-title font-display">TV Shows</h1>
          <SkeletonRow title="Popular Right Now" />
          <SkeletonRow title="Top Rated" />
          <SkeletonRow title="On The Air" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" id="tv-page">
      <div className="page-content tv-header-spacing">
        <h1 className="page-title font-display">TV Shows</h1>
      </div>

      <CategoryRow title="Popular Right Now" items={popularTV} mediaType="tv" />
      <CategoryRow title="Top Rated" items={topRatedTV} mediaType="tv" badge="TOP" />
      <CategoryRow title="Currently Airing" items={onTheAir} mediaType="tv" badge="NEW" />
      <CategoryRow title="Sci-Fi & Fantasy" items={sciFiTV} mediaType="tv" />
      <CategoryRow title="Crime" items={crimeTV} mediaType="tv" />
      <CategoryRow title="Drama" items={dramaTV} mediaType="tv" />
    </div>
  )
}
