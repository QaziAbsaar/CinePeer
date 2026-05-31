import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { searchMulti, getPosterUrl } from '../services/tmdb'
import useAppStore from '../store/useAppStore'
import useMediaStore from '../store/useMediaStore'
import MediaCard from './MediaCard'
import './SearchOverlay.css'

export default function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useAppStore()
  const { searchQuery, setSearchQuery, searchResults, setSearchResults, isSearching, setIsSearching } = useMediaStore()
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSearchOpen])

  // Debounced search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchMulti(query)
        const filtered = (data.results || []).filter(
          item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
        )
        setSearchResults(filtered)
      } catch (err) {
        console.error('Search failed:', err)
        setSearchResults([])
      }
    }, 300)
  }, [setSearchQuery, setSearchResults, setIsSearching])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') closeSearch()
    }
    if (isSearchOpen) {
      window.addEventListener('keydown', handleKey)
    }
    return () => window.removeEventListener('keydown', handleKey)
  }, [isSearchOpen, closeSearch])

  if (!isSearchOpen) return null

  return (
    <div className="search-overlay fade-in" id="search-overlay">
      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search movies, TV shows..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => handleSearch('')}>
            <X size={18} />
          </button>
        )}
        <button className="search-close-btn" onClick={closeSearch}>
          Close
        </button>
      </div>

      {/* Results */}
      <div className="search-results">
        {isSearching && (
          <div className="search-loading">
            <div className="spinner" />
            <span>Searching...</span>
          </div>
        )}

        {!isSearching && searchResults.length > 0 && (
          <div className="media-grid search-grid">
            {searchResults.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                mediaType={item.media_type}
              />
            ))}
          </div>
        )}

        {!isSearching && searchQuery && searchResults.length === 0 && (
          <div className="search-empty">
            <p>No results found for "{searchQuery}"</p>
            <p className="text-meta">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )
}
