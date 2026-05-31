import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Search, Download, Settings, Film, X, Minus, Square } from 'lucide-react'
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
  const [isMaxed, setIsMaxed] = useState(false)
  const navRef = useRef(null)
  const { toggleSearch, isSearchOpen, toggleDownloadManager } = useAppStore()
  const activeTorrents = useTorrentStore((s) => s.activeTorrents)
  const activeCount = Object.keys(activeTorrents).filter(k => k !== '_pending').length
  const location = useLocation()
  const wc = window.electron?.windowControls || window.electron?.window

  // Measure navbar bottom edge → set CSS var for page padding
  const measureOffset = useCallback(() => {
    if (navRef.current) {
      const rect = navRef.current.getBoundingClientRect()
      const offset = rect.top + rect.height
      document.documentElement.style.setProperty('--navbar-offset', offset + 'px')
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Measure after mount + on resize (handles maximize/restore)
  useEffect(() => {
    measureOffset()
    window.addEventListener('resize', measureOffset)
    return () => window.removeEventListener('resize', measureOffset)
  }, [measureOffset])

  // Re-measure when nav links change
  useEffect(() => {
    const timer = setTimeout(measureOffset, 0)
    return () => clearTimeout(timer)
  }, [location.pathname, measureOffset])

  // Hide navbar on player page
  if (location.pathname === '/player') return null

  const handleMin = () => { wc?.minimize() }
  const handleMax = () => {
    wc?.maximize()
    setIsMaxed((p) => !p)
  }
  const handleClose = () => { wc?.close() }

  return (
    <nav
      ref={navRef}
      className={`navbar navbar-frameless ${scrolled ? 'navbar-solid' : 'navbar-transparent'}`}
    >
      <div className="navbar-content">
        {/* Logo */}
        <NavLink to="/" className="navbar-logo titlebar-no-drag">
          <Film size={24} className="logo-icon" />
          <span className="logo-text font-display">CINEPEER</span>
        </NavLink>

        {/* Nav Links */}
        <div className="navbar-links titlebar-no-drag">
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
        <div className="navbar-actions titlebar-no-drag">
          <button className="nav-action-btn" onClick={toggleSearch} title="Search" id="nav-search-btn">
            {isSearchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
          <button className="nav-action-btn download-btn" onClick={toggleDownloadManager} title="Downloads" id="nav-downloads-btn">
            <Download size={20} />
            {activeCount > 0 && <span className="download-badge">{activeCount}</span>}
          </button>
          <NavLink to="/settings" className="nav-action-btn" title="Settings" id="nav-settings-btn">
            <Settings size={20} />
          </NavLink>
        </div>

        {/* Custom window controls — top-right of frameless window */}
        <div className="window-controls titlebar-no-drag">
          <button className="win-btn win-btn-min" onClick={handleMin} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="win-btn win-btn-max" onClick={handleMax} title={isMaxed ? 'Restore' : 'Maximize'}>
            {isMaxed ? (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect x="2" y="3.5" width="6.5" height="6.5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="3.5" y="2" width="6.5" height="6.5" rx="0.5" fill="var(--bg-primary)" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            ) : (
              <Square size={12} />
            )}
          </button>
          <button className="win-btn win-btn-close" onClick={handleClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
    </nav>
  )
}
