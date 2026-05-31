import { useState, useEffect } from 'react'
import { getTrending, getPopularMovies, getTopRatedMovies, getNowPlayingMovies, getPopularTV, getTopRatedTV, discoverByGenre } from '../services/tmdb'
import FeaturedBanner from '../components/FeaturedBanner'
import CategoryRow from '../components/CategoryRow'
import { SkeletonBanner, SkeletonRow } from '../components/SkeletonLoader'
import './HomePage.css'

export default function HomePage() {
  const [trending, setTrending] = useState([])
  const [popularMovies, setPopularMovies] = useState([])
  const [topRatedMovies, setTopRatedMovies] = useState([])
  const [nowPlaying, setNowPlaying] = useState([])
  const [popularTV, setPopularTV] = useState([])
  const [topRatedTV, setTopRatedTV] = useState([])
  const [actionMovies, setActionMovies] = useState([])
  const [comedyMovies, setComedyMovies] = useState([])
  const [dramaMovies, setDramaMovies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [
          trendingData,
          popularData,
          topRatedData,
          nowPlayingData,
          popTVData,
          topTVData,
          actionData,
          comedyData,
          dramaData
        ] = await Promise.allSettled([
          getTrending('all', 'week'),
          getPopularMovies(),
          getTopRatedMovies(),
          getNowPlayingMovies(),
          getPopularTV(),
          getTopRatedTV(),
          discoverByGenre('movie', 28),
          discoverByGenre('movie', 35),
          discoverByGenre('movie', 18)
        ])

        if (trendingData.status === 'fulfilled') setTrending(trendingData.value.results || [])
        if (popularData.status === 'fulfilled') setPopularMovies(popularData.value.results || [])
        if (topRatedData.status === 'fulfilled') setTopRatedMovies(topRatedData.value.results || [])
        if (nowPlayingData.status === 'fulfilled') setNowPlaying(nowPlayingData.value.results || [])
        if (popTVData.status === 'fulfilled') setPopularTV(popTVData.value.results || [])
        if (topTVData.status === 'fulfilled') setTopRatedTV(topTVData.value.results || [])
        if (actionData.status === 'fulfilled') setActionMovies(actionData.value.results || [])
        if (comedyData.status === 'fulfilled') setComedyMovies(comedyData.value.results || [])
        if (dramaData.status === 'fulfilled') setDramaMovies(dramaData.value.results || [])
      } catch (err) {
        console.error('Failed to fetch home data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="page-container">
        <SkeletonBanner />
        <SkeletonRow title="Trending This Week" />
        <SkeletonRow title="Popular Movies" />
        <SkeletonRow title="Popular TV Shows" />
      </div>
    )
  }

  return (
    <div className="page-container home-page" id="home-page">
      {/* Hero Banner */}
      <FeaturedBanner items={trending.slice(0, 8)} />

      {/* Category Rows */}
      <div className="home-rows">
        <CategoryRow title="Trending This Week" items={trending} badge="TRENDING" />
        <CategoryRow title="New Releases" items={nowPlaying} mediaType="movie" badge="NEW" />
        <CategoryRow title="Popular Movies" items={popularMovies} mediaType="movie" />
        <CategoryRow title="Popular TV Shows" items={popularTV} mediaType="tv" />
        <CategoryRow title="Top Rated Movies" items={topRatedMovies} mediaType="movie" badge="TOP" />
        <CategoryRow title="Top Rated TV Shows" items={topRatedTV} mediaType="tv" badge="TOP" />
        <CategoryRow title="Action & Adventure" items={actionMovies} mediaType="movie" />
        <CategoryRow title="Comedy" items={comedyMovies} mediaType="movie" />
        <CategoryRow title="Drama" items={dramaMovies} mediaType="movie" />
      </div>
    </div>
  )
}
