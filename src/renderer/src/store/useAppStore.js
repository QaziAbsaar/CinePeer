import { create } from 'zustand'

function hasValidKey() {
  return !!localStorage.getItem('sv_tmdb_api_key') || !!localStorage.getItem('sv_omdb_api_key')
}

const useAppStore = create((set, get) => ({
  // ── TMDB API Key ──────────────────────────────────────────
  tmdbApiKey: localStorage.getItem('sv_tmdb_api_key') || '',
  setTmdbApiKey: (key) => {
    localStorage.setItem('sv_tmdb_api_key', key)
    set({ tmdbApiKey: key, isSetupComplete: hasValidKey() || !!key })
  },

  // ── Setup state ───────────────────────────────────────────
  isSetupComplete: hasValidKey(),

  // ── Settings ──────────────────────────────────────────────
  defaultQuality: localStorage.getItem('sv_default_quality') || '1080p',
  setDefaultQuality: (quality) => {
    localStorage.setItem('sv_default_quality', quality)
    set({ defaultQuality: quality })
  },

  downloadPath: localStorage.getItem('sv_download_path') || '',
  setDownloadPath: (path) => {
    localStorage.setItem('sv_download_path', path)
    set({ downloadPath: path })
  },

  ytsBaseUrl: localStorage.getItem('sv_yts_base_url') || 'https://yts.mx/api/v2',
  setYtsBaseUrl: (url) => {
    localStorage.setItem('sv_yts_base_url', url)
    set({ ytsBaseUrl: url })
  },

  subtitleLanguage: localStorage.getItem('sv_subtitle_lang') || 'en',
  setSubtitleLanguage: (lang) => {
    localStorage.setItem('sv_subtitle_lang', lang)
    set({ subtitleLanguage: lang })
  },

  maxDownloadSpeed: parseInt(localStorage.getItem('sv_max_download_speed') || '0', 10),
  setMaxDownloadSpeed: (speed) => {
    localStorage.setItem('sv_max_download_speed', String(speed))
    set({ maxDownloadSpeed: speed })
  },

  // ── Subtitles ───────────────────────────────────────────────
  opensubtitlesApiKey: localStorage.getItem('sv_opensubtitles_api_key') || '',
  setOpensubtitlesApiKey: (key) => {
    localStorage.setItem('sv_opensubtitles_api_key', key)
    set({ opensubtitlesApiKey: key })
  },

  subtitleEnabled: localStorage.getItem('sv_subtitle_enabled') !== 'false',
  setSubtitleEnabled: (enabled) => {
    localStorage.setItem('sv_subtitle_enabled', String(enabled))
    set({ subtitleEnabled: enabled })
  },

  // ── Metadata Source (OMDB fallback) ────────────────────────
  omdbApiKey: localStorage.getItem('sv_omdb_api_key') || '',
  setOmdbApiKey: (key) => {
    localStorage.setItem('sv_omdb_api_key', key)
    set({ omdbApiKey: key, isSetupComplete: hasValidKey() || !!key })
  },

  // ── UI State ──────────────────────────────────────────────
  isDownloadManagerOpen: false,
  toggleDownloadManager: () => set((s) => ({ isDownloadManagerOpen: !s.isDownloadManagerOpen })),
  closeDownloadManager: () => set({ isDownloadManagerOpen: false }),

  isSearchOpen: false,
  toggleSearch: () => set((s) => ({ isSearchOpen: !s.isSearchOpen })),
  closeSearch: () => set({ isSearchOpen: false })
}))

export default useAppStore
