import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Search, Download, Settings, Film, X } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import useTorrentStore from '../store/useTorrentStore'
import './Navbar.css'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/movies', label: 'Movies' },
  { to: '/tv', label: 'TV Shows' },
  { to: '/watchlist', label: 'My List' }
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { toggleSearch, isSearchOpen, toggleDownloadManager, isDownloadManagerOpen } = useAppStore()
  const activeTorrents = useTorrentStore((s) => s.activeTorrents)
  const activeCount = Object.keys(activeTorrents).filter(k => k !== '_pending').length
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Hide navbar on player page
  if (location.pathname === '/player') return null

  return (
    <nav className={`navbar ${scrolled ? 'navbar-solid' : 'navbar-transparent'}`}>
      {/* Titlebar drag region */}
      <div className="navbar-drag titlebar-drag" />

      <div className="navbar-content titlebar-no-drag">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo">
          <Film size={24} className="logo-icon" />
          <span className="logo-text font-display">STREAMVAULT</span>
        </NavLink>

        {/* Nav Links */}
        <div className="navbar-links">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
              end={to === '/'}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right Actions */}
        <div className="navbar-actions">
          <button
            className="nav-action-btn"
            onClick={toggleSearch}
            title="Search"
            id="nav-search-btn"
          >
            {isSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>

          <button
            className="nav-action-btn download-btn"
            onClick={toggleDownloadManager}
            title="Downloads"
            id="nav-downloads-btn"
          >
            <Download size={20} />
            {activeCount > 0 && (
              <span className="download-badge">{activeCount}</span>
            )}
          </button>

          <NavLink to="/settings" className="nav-action-btn" title="Settings" id="nav-settings-btn">
            <Settings size={20} />
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
