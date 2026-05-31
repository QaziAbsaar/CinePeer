import { create } from 'zustand'

const useMediaStore = create((set, get) => ({
  // ── Selected media (for detail modal) ─────────────────────
  selectedMedia: null,
  selectedMediaType: 'movie',
  setSelectedMedia: (media, mediaType = 'movie') =>
    set({ selectedMedia: media, selectedMediaType: mediaType }),
  clearSelectedMedia: () =>
    set({ selectedMedia: null, selectedMediaType: 'movie' }),

  // ── Search ────────────────────────────────────────────────
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results, isSearching: false }),
  setIsSearching: (val) => set({ isSearching: val }),

  // ── Filters (for Movies/TV pages) ─────────────────────────
  filters: {
    sort_by: 'date_added',
    genre: 'All',
    quality: 'All',
    year: 'All',
    minimum_rating: 0
  },
  setFilter: (key, value) =>
    set((s) => ({
      filters: { ...s.filters, [key]: value }
    })),
  resetFilters: () =>
    set({
      filters: {
        sort_by: 'date_added',
        genre: 'All',
        quality: 'All',
        year: 'All',
        minimum_rating: 0
      }
    }),

  // ── Watchlist ─────────────────────────────────────────────
  watchlist: JSON.parse(localStorage.getItem('sv_watchlist') || '[]'),
  addToWatchlist: (item) => {
    const current = get().watchlist
    const exists = current.some(w => w.id === item.id && w.media_type === item.media_type)
    if (exists) return
    const updated = [{ ...item, addedAt: Date.now() }, ...current]
    localStorage.setItem('sv_watchlist', JSON.stringify(updated))
    set({ watchlist: updated })
  },
  removeFromWatchlist: (id, mediaType) => {
    const updated = get().watchlist.filter(w => !(w.id === id && w.media_type === mediaType))
    localStorage.setItem('sv_watchlist', JSON.stringify(updated))
    set({ watchlist: updated })
  },
  isInWatchlist: (id, mediaType) => {
    return get().watchlist.some(w => w.id === id && w.media_type === mediaType)
  }
}))

export default useMediaStore
