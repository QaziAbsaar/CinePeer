import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAppStore from './store/useAppStore'
import Navbar from './components/Navbar'
import DetailModal from './components/DetailModal'
import DownloadManager from './components/DownloadManager'
import SearchOverlay from './components/SearchOverlay'
import ToastContainer from './components/Toast'
import NetworkStatus from './components/NetworkStatus'
import HomePage from './pages/HomePage'
import MoviesPage from './pages/MoviesPage'
import TVShowsPage from './pages/TVShowsPage'
import AnimePage from './pages/AnimePage'
import TVEpisodesPage from './pages/TVEpisodesPage'
import PlayerPage from './pages/PlayerPage'
import WatchlistPage from './pages/WatchlistPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const { isSetupComplete } = useAppStore()

  return (
    <HashRouter>
      {/* Global UI layers */}
      <Navbar />
      <SearchOverlay />
      <DetailModal />
      <DownloadManager />
      <NetworkStatus />
      <ToastContainer />

      {/* Routes */}
      <Routes>
        {!isSetupComplete ? (
          <>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/settings" replace />} />
          </>
        ) : (
          <>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/tv" element={<TVShowsPage />} />
            <Route path="/tv-episodes" element={<TVEpisodesPage />} />
            <Route path="/anime" element={<AnimePage />} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </HashRouter>
  )
}
