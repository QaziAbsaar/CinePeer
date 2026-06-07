# 📊 CinePeer — Progress Report

> **Generated**: 2026-06-07
> **Stack**: Electron 31 + React 18 + Vite 5 + WebTorrent 2.5 + Zustand 4.5
> **Total**: 56 source files | ~7,625 lines of code

---

## 📋 Project Status Overview

| Area | Status | Completion |
|------|--------|-----------|
| Project Scaffold | ✅ Complete | 100% |
| Electron Main Process | ✅ Complete | 100% |
| Preload / IPC Bridge | ✅ Complete | 100% |
| Design System (CSS) | ✅ Complete | 95% |
| Pages / Routing | ✅ Complete | 90% |
| UI Components | ✅ Complete | 90% |
| API Services | ✅ Complete | 85% |
| State Management | ✅ Complete | 95% |
| Torrent Streaming | ✅ Complete | 85% |
| Settings / Config | ✅ Complete | 90% |
| Build Config | ✅ Complete | 90% |
| Testing | 🔴 Not Started | 0% |
| Accessibility | 🟡 Partial | 30% |
| Responsive Design | 🟡 Adequate | 60% |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     ELECTRON SHELL                        │
│                                                           │
│  ┌──────────────────────┐   ┌──────────────────────────┐ │
│  │   RENDERER PROCESS   │   │     MAIN PROCESS         │ │
│  │   (React + Vite)     │◄──►  (Node.js + WebTorrent)  │ │
│  │                      │IPC│                           │ │
│  │  • UI Components     │   │  • Torrent Engine         │ │
│  │  • Zustand Stores    │   │  • HTTP Stream Server     │ │
│  │  • OMDb/Fanart calls │   │  • File System Access     │ │
│  │  • React Router      │   │  • Window Management      │ │
│  └──────────────────────┘   └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
           │                            │
           ▼                            ▼
    ┌─────────────────┐       ┌──────────────────────┐
    │  Trakt.tv API   │       │  YTS / EZTV API      │
    │  (discovery)    │       │  (magnet torrents)    │
    │  + OMDb/Fanart  │       │  + WebTorrent engine  │
    │  (metadata)     │       │  + HTTP stream server │
    └─────────────────┘       └──────────────────────┘
```

---

## 📁 File-by-File Breakdown

### 🖥️ Main Process — `src/main/index.js` (284 lines)

**Working:**
- ✅ Frameless BrowserWindow with custom titlebar
- ✅ CSP headers (img-src, media-src, connect-src configured per provider)
- ✅ TorrentManager class with add, progress, destroy, list, destroyAll
- ✅ HTTP range-request streaming server (random port)
- ✅ IPC handlers: `torrent:add`, `torrent:progress`, `torrent:destroy`, `torrent:list`
- ✅ System IPC: getDownloadPath, getUserDataPath, openFolder, selectDirectory
- ✅ Window controls: minimize, maximize, close
- ✅ macOS `activate` event handling
- ✅ Cleanup all torrents on quit

**Issues:**
- ⚠️ No upload/download speed limits passed to WebTorrent client
- ⚠️ `sandbox: false` — potential security concern
- ⚠️ No torrent resume/persistence across app restarts

---

### 🔗 Preload — `src/preload/index.js` (26 lines)

**Working:**
- ✅ contextBridge exposes `window.electron` with torrent/system/window modules
- ✅ Duplicate `windowControls` alias for convenience

---

### 🎨 Design System — `src/renderer/src/index.css` (893 lines)

**Working:**
- ✅ Full CSS custom properties (colors, gradients, shadows, spacing, typography)
- ✅ CSS reset, scrollbar styling, typography classes
- ✅ Glass card, button (primary/secondary/danger/icon), badge, genre pill, shimmer
- ✅ Modal overlay, input fields, progress bar, torrent table styles
- ✅ Keyframe animations (fadeIn, slideUp, slideDown, shimmer, pulseGlow, spin)
- ✅ Error boundary, offline banner, error state, section error styles
- ✅ Utility classes (truncate, spinner, gradient-text, rating-display)
- ✅ Responsive breakpoints at 1200px, 768px, 480px
- ✅ Electron titlebar drag regions

---

### 📄 Pages

#### HomePage (119 lines + 9 CSS)
- ✅ 9 category rows via `Promise.allSettled`: Trending, New Releases, Popular Movies/TV, Top Rated Movies/TV, Action, Comedy, Drama
- ✅ Hero banner with autoplay backdrop
- ✅ Skeleton loading state
- ✅ Error state with retry button
- ⚠️ Uses Trakt first, falls back to OMDb keyword search (limited pool of 10 keywords)

#### MoviesPage (193 lines + 23 CSS)
- ✅ YTS movie listing with filters
- ✅ Infinite scroll via IntersectionObserver
- ✅ Custom YTSMovieCard with YTS poster (no TMDB dependency)
- ✅ Skeleton loading, error, empty states
- ❌ **Bug**: Year filter sets `minimum_rating = 0` instead of filtering by year (line 36)
- ⚠️ No pagination controls (purely infinite scroll)

#### TVShowsPage (98 lines + 3 CSS)
- ✅ 6 category rows: Popular, Top Rated, On The Air, Sci-Fi, Crime, Drama
- ✅ `Promise.allSettled` with graceful degradation
- ✅ Skeleton loading, error states

#### PlayerPage (533 lines + 321 CSS)
- ✅ Full video player with custom controls
- ✅ Play/pause, seek (skip ±10s), volume slider, mute, fullscreen
- ✅ Keyboard shortcuts (Space/K, F, M, C, arrows, Escape)
- ✅ Buffering indicator with spinner
- ✅ Live torrent download stats (speed, progress %, peers)
- ✅ Screen Wake Lock API integration
- ✅ Subtitle system via OpenSubtitles:
  - ✅ Auto-fetch on stream start
  - ✅ Language picker with 12 languages
  - ✅ On/off toggle
  - ✅ SRT → WebVTT conversion
- ✅ Stream error state with retry
- ✅ Empty state ("No stream selected")
- ✅ Context menu disabled
- ✅ Cleanup on unmount (wake lock, blob URLs)
- ⚠️ No playback speed control
- ⚠️ No picture-in-picture
- ⚠️ No chapter/bookmark support

#### WatchlistPage (36 lines + 16 CSS)
- ✅ Displays saved items in media grid
- ✅ Empty state with icon and helpful message
- ✅ Items persist across sessions via localStorage

#### SettingsPage (414 lines + 128 CSS)
- ✅ OMDb API key input with validation
- ✅ Fanart.tv API key input with validation
- ✅ Trakt.tv Client ID input with validation
- ✅ OpenSubtitles API key input with validation
- ✅ Default quality selector (720p/1080p/2160p/3D)
- ✅ YTS base URL configuration
- ✅ Download location with folder picker
- ✅ Bandwidth limit selector (Unlimited to 50 MB/s)
- ✅ About section with version and source info
- ✅ Toast notifications on save
- ⚠️ Bandwidth limit is stored but not enforced in WebTorrent

---

### 🧩 Components

#### Navbar (127 lines + 169 CSS)
- ✅ Transparent-to-solid scroll effect
- ✅ Nav links (Home, Movies, TV Shows, My List) with active state
- ✅ Search toggle button with open/close icon
- ✅ Download button with active count badge
- ✅ Settings link
- ✅ Custom window controls (minimize, maximize/restore, close)
- ✅ CSS custom property `--navbar-offset` for page padding
- ✅ Hidden on `/player` route
- ⚠️ No dropdown/hamburger menu on very small screens

#### MediaCard (117 lines + 154 CSS)
- ✅ Poster image with lazy loading and shimmer placeholder
- ✅ Fallback "no image" state
- ✅ Badge support (trending, new, top)
- ✅ Hover overlay with "Details" button and watchlist toggle
- ✅ Title, year, rating display
- ⚠️ No hover video preview/thumbnail

#### CategoryRow (81 lines + 74 CSS)
- ✅ Horizontal scroll with left/right arrow buttons
- ✅ Arrow visibility based on scroll position
- ✅ Optional "See more" link
- ✅ Empty/null items handled (returns null)

#### FeaturedBanner (143 lines + 137 CSS)
- ✅ Auto-rotation every 8 seconds
- ✅ Multiple image sources: backdrop → poster → gradient fallback
- ✅ Preloading of backdrop images
- ✅ Slide indicators (max 8)
- ✅ Genre pills, rating badge, year
- ✅ Overview text (truncated to 3 lines)
- ✅ Play Now + More Info buttons
- ✅ Fade transition between slides

#### DetailModal (288 lines + 192 CSS)
- ✅ Full-screen modal with backdrop gradient
- ✅ Detailed metadata (rating, year, runtime, genres, overview)
- ✅ Cast section with profile avatars (initials fallback)
- ✅ Torrent table with quality, size, seeds/peers, health indicator
- ✅ Color-coded health: excellent (green), good (cyan), okay (gold), low (orange), dead (red)
- ✅ Stream button per torrent quality
- ✅ Loading state while finding sources
- ✅ Empty state ("No streams available")
- ✅ Close on Escape + overlay click
- ⚠️ Torrent fetching uses TMDB first then falls back (legacy pattern from TMDB era)

#### DownloadManager (175 lines + 172 CSS)
- ✅ Slide-out panel overlay
- ✅ Active torrents section with progress bars
- ✅ Live download speed, peers, ETA
- ✅ "Complete" status indicator
- ✅ History section with completion dates
- ✅ Open in folder, remove from history, clear all
- ✅ Empty state with helpful message
- ✅ Auto-polling every 2s
- ⚠️ History not fully interactive (no re-download)

#### SearchOverlay (112 lines + 94 CSS)
- ✅ Full-screen search overlay
- ✅ Auto-focus on open
- ✅ Debounced search (300ms)
- ✅ Multi-search across movies + TV shows
- ✅ Results displayed as media grid
- ✅ Loading spinner, empty results, clear button
- ✅ Close on Escape

#### FilterBar (66 lines + 38 CSS)
- ✅ Sort by (Latest, Rating, Year, Title, Seeds, Downloads, Likes)
- ✅ Genre filter (23 YTS genres)
- ✅ Year filter (1970 to current)
- ✅ Quality filter (All, 720p, 1080p, 2160p, 3D)

#### ErrorBoundary (47 lines)
- ✅ Class-based React error boundary
- ✅ Collapsible error details (with `showDetails` prop)
- ✅ Retry button that resets error state

#### NetworkStatus (26 lines)
- ✅ Online/offline detection via browser events
- ✅ Visual offline banner with WifiOff icon

#### Toast (41 lines + 89 CSS)
- ✅ Success, error, warning, info types with icons
- ✅ Auto-dismiss (configurable duration)
- ✅ Manual dismiss button
- ✅ Slide-in animation

#### SkeletonLoader (48 lines + 98 CSS)
- ✅ SkeletonCard (poster + info shimmer)
- ✅ SkeletonRow (title + 8 skeleton cards)
- ✅ SkeletonBanner (title, meta, description, action buttons)

---

### 📡 API Services

#### Metadata — `services/metadata.js` (415 lines)
- ✅ Unified facade that routes to TMDB (legacy), OMDb (primary), Trakt (discovery)
- ✅ Trakt-first with OMDb keyword fallback for all discovery endpoints
- ✅ Fanart.tv image enrichment
- ✅ OMDb + Trakt key validation
- ✅ `getPosterUrl`, `getBackdropUrl`, `getProfileUrl` helpers (full URL passthrough)
- ✅ `searchMulti` — parallel movie + series search with dedup
- ✅ `getDetails` — full metadata + Fanart enrichment + cast from Actors field
- ✅ `getCredits`, `getVideos` (empty), `getSimilar` (empty — OMDb lacks these)

#### Trakt — `services/trakt.js` (235 lines)
- ✅ Trending movies/shows
- ✅ Popular movies/shows
- ✅ Top rated movies/shows
- ✅ Recommended movies/shows
- ✅ Image enrichment from Fanart.tv + OMDb fallback
- ✅ Response caching (5 min TTL)

#### OMDb — `services/omdb.js` (189 lines)
- ✅ Search movies and series
- ✅ Full details by IMDB ID
- ✅ Key validation
- ✅ Poster URL helper
- ⚠️ No backdrop support, max 100 results, 10 per page

#### TMDB — `services/tmdb.js` (415 lines) — ⚠️ DEAD CODE
- Complete TMDB client exists but is **no longer the primary source**
- All exports are still re-exported through metadata.js
- Should be considered for removal to reduce bundle size
- Kept only for backward compatibility

#### YTS — `services/yts.js` (105 lines)
- ✅ `listMovies` with filters, sorting, pagination
- ✅ `getMovieDetails` with cast and images
- ✅ `getMovieSuggestions`
- ✅ `searchByImdbId` for TMDB→YTS bridge
- ✅ Magnet URI enrichment
- ✅ Retry interceptor with exponential backoff

#### EZTV — `services/eztv.js` (95 lines)
- ✅ `getTorrents` by IMDB ID
- ✅ Season/episode extraction from filename
- ✅ Quality extraction (2160p/1080p/720p/480p)
- ✅ Size formatting
- ✅ Sort by season → episode → seeds descending
- ✅ Retry interceptor with exponential backoff

#### OpenSubtitles — `services/opensubtitles.js` (170 lines)
- ✅ `searchSubtitles` by IMDB ID + language
- ✅ `downloadSubtitle` — request download URL, fetch SRT content
- ✅ `srtToWebVtt` conversion
- ✅ `webVttToDataUri` blob URL creation
- ✅ `getSubtitleLanguages` — unique language list
- ✅ `validateOsApiKey` — endpoint test

---

### 🗄️ State Management (Zustand)

#### useAppStore (86 lines)
- ✅ OMDb API key (persisted: `sv_omdb_api_key`)
- ✅ Fanart.tv API key (persisted: `sv_fanart_api_key`)
- ✅ Trakt.tv Client ID (persisted: `sv_trakt_client_id`)
- ✅ Default quality (persisted: `sv_default_quality`)
- ✅ Download path (persisted: `sv_download_path`)
- ✅ YTS base URL (persisted: `sv_yts_base_url`)
- ✅ Subtitle language (persisted: `sv_subtitle_lang`)
- ✅ Max download speed (persisted: `sv_max_download_speed`)
- ✅ OpenSubtitles API key (persisted: `sv_opensubtitles_api_key`)
- ✅ Subtitle enabled toggle (persisted: `sv_subtitle_enabled`)
- ✅ UI state: download manager open/close, search open/close
- ✅ Setup complete detection (has OMDb key)

#### useMediaStore (63 lines)
- ✅ Selected media + type (for detail modal)
- ✅ Search query, results, loading state
- ✅ Filter state (sort, genre, quality, year, rating)
- ✅ Watchlist (persisted: `sv_watchlist`) with add/remove/check

#### useTorrentStore (225 lines)
- ✅ Active torrents map with metadata
- ✅ Current stream tracking
- ✅ Download history (persisted: `sv_download_history`, max 200 entries)
- ✅ Add torrent with pending state → Electron IPC
- ✅ Progress polling with status tracking
- ✅ Auto-mark completed → move to history
- ✅ Auto-start/stop polling based on activity
- ✅ Browser fallback (dev mode without Electron)

#### useToastStore (35 lines)
- ✅ Toast queue with auto-dismiss
- ✅ Add/remove/clear operations
- ✅ Unique IDs via uid()

---

### 🛠️ Utilities

#### constants.js (111 lines)
- ✅ API URLs (Fanart, YTS, EZTV)
- ✅ Placeholder image (inline SVG)
- ✅ TMDB genre map, YTS genre list
- ✅ Sort options, quality options, dynamic year range
- ✅ Public BitTorrent trackers (8 trackers)
- ✅ `buildMagnetUri` — magnet link generator
- ✅ Format helpers: `formatBytes`, `formatSpeed`, `formatDuration`, `formatTimeRemaining`

#### cache.js (56 lines)
- ✅ localStorage-based TTL cache (5 min default)
- ✅ Auto-cleanup on expiry read
- ✅ Fallback: clear expired entries on storage full
- ✅ `clearAllCache` for manual invalidation

#### electron.js (39 lines)
- ✅ `electronInvoke` — safe IPC call with fallback
- ✅ `isRunningInElectron` detection
- ✅ `getPlatform` — "electron" or "browser"

#### helpers.js (62 lines)
- ✅ Re-exports formatting utils from constants
- ✅ `debounce` with configurable delay
- ✅ `truncate` with ellipsis
- ✅ `extractYear` from date string
- ✅ `clamp` for number ranges
- ✅ `uid` for unique IDs

#### retry.js (41 lines)
- ✅ Axios retry interceptor with exponential backoff
- ✅ Max 2 retries, 1s initial delay
- ✅ Retries 408, 429, 500, 502, 503, 504 + network errors

---

### ⚙️ Build & Config

#### electron.vite.config.mjs (27 lines)
- ✅ electron-vite + React plugin
- ✅ WebTorrent externalized (native module)
- ✅ `@` path alias for renderer

#### package.json (30 lines)
- ✅ Scripts: dev, build, preview, start
- ✅ Dependencies: axios, lucide-react, react, react-dom, react-router-dom, webtorrent, zustand
- ✅ DevDependencies: electron, electron-builder, electron-vite, vite, @vitejs/plugin-react

#### CSP Configuration
- ✅ `default-src 'self'`
- ✅ `img-src: self, data:, yts.mx, amazon.com, fanart.tv`
- ✅ `media-src: self, localhost:*`
- ✅ `connect-src: self, omdbapi.com, fanart.tv, trakt.tv, yts.mx, eztv.re, localhost:*`

---

## 🐛 Known Issues & Bugs

### Critical
| # | Issue | File | Line(s) |
|---|-------|------|---------|
| 1 | Year filter sets `minimum_rating = 0` instead of filtering by year | `MoviesPage.jsx` | 36 |
| 2 | TMDB dead code (415 lines) still bundled and re-exported | `services/tmdb.js` | All |

### Medium
| # | Issue | Details |
|---|-------|---------|
| 3 | Bandwidth limit configured but not enforced in WebTorrent | `useAppStore` stores it, `TorrentManager` doesn't apply `downloadLimit` |
| 4 | Trakt default limit 10 per page may be too small | `trakt.js` passes `limit` but Trakt behavior varies |
| 5 | EZTV domain (`eztv.re`) may change, causing TV show torrents to fail | `constants.js` |
| 6 | OMDb fallback keyword pool is only 10 keywords per type | `metadata.js` — limited discovery without Trakt |
| 7 | DetailModal fetches TMDB details first (legacy pattern) then falls back to YTS/EZTV | `DetailModal.jsx` |
| 8 | `index.html` missing from renderer directory | `src/renderer/index.html` — vite handles it, but the file may not exist as expected |

### Low
| # | Issue | Details |
|---|-------|---------|
| 9 | `sandbox: false` in BrowserWindow | Security hardening opportunity |
| 10 | No loading state when switching between Settings tabs | Instant, but no transition |
| 11 | No pagination controls on MoviesPage | Only infinite scroll |
| 12 | Player lacks playback speed control | No 0.5x–2x speed toggle |
| 13 | No picture-in-picture mode | Browser API available |
| 14 | No auto-updater | No `electron-updater` integration |
| 15 | Error messages sometimes console-only | Missing user-facing toasts in some catch blocks |
| 16 | Watchlist items may become stale if content is removed from source | No refresh mechanism |
| 17 | TV show season/episode browsing not implemented | Shows are browsable but not watchable per-episode |
| 18 | No light mode | Dark-only design |

---

## 🚧 Missing Features

### High Priority
- [ ] **TV Show episode selection** — Browse seasons/episodes and stream individual episodes
- [ ] **TMDB dead code cleanup** — Remove `services/tmdb.js` or archive it
- [ ] **Year filter fix** — On MoviesPage, actually filter by year instead of setting `minimum_rating = 0`
- [ ] **Bandwidth limit enforcement** — Pass `downloadLimit`/`uploadLimit` to WebTorrent client
- [ ] **Continue watching** — Track and resume playback position per title

### Medium Priority
- [ ] **Playback speed control** — 0.5x, 1x, 1.25x, 1.5x, 2x
- [ ] **Picture-in-picture mode**
- [ ] **Cache management UI** — Clear cache from Settings
- [ ] **Keyboard shortcuts reference overlay**
- [ ] **Auto-updater integration** — `electron-updater` with GitHub releases
- [ ] **Native OS notifications** — Download complete, stream ready
- [ ] **Responsive improvements** — Better tablet/small screen layout
- [ ] **Pagination controls** — Classic page numbers on MoviesPage

### Low Priority / Nice-to-Have
- [ ] **Light/dark theme toggle**
- [ ] **Multi-language UI** (i18n)
- [ ] **Custom torrent sources** — Add custom trackers/search providers
- [ ] **M3U/playlist import**
- [ ] **Hover video preview** on media cards
- [ ] **Favorites/ratings sync**
- [ ] **Background music player**
- [ ] **Accessibility audit** — ARIA labels, focus management, screen reader support
- [ ] **Unit tests** — Jest/Vitest for stores, services, components
- [ ] **E2E tests** — Playwright/Electron testing
- [ ] **Performance optimization** — React.memo, useMemo, virtualization for large lists

---

## 🔧 Tech Debt

| Area | Description | Effort |
|------|-------------|--------|
| `services/tmdb.js` | Dead code — 415 lines, fully replaced by OMDb+Trakt. Remove after confirming no consumers left. | Small |
| `services/metadata.js` | Re-exports from TMDB; the re-export layer can be removed once TMDB file is gone. | Small |
| Error handling | Some catch blocks only `console.error` without user feedback. Inconsistent pattern. | Medium |
| Accessibility | Minimal ARIA labels, no keyboard navigation for carousels/modals beyond Escape. | Medium |
| Testing | Zero test files. No CI pipeline. | Large |
| TypeScript | None — entire codebase is plain JSX/JS. | Large |

---

## 📈 Git History (Recent)

```
812a555 Baner fixed in hero section
2e86a69 chore: remove accidental .env.save
7389e1e fix: validateFanartKey now uses raw axios, interceptor no longer swallows errors
6abf49a feat: integrate Trakt.tv API for trending/popular discovery
b041fb5 feat: replace TMDB with OMDb + Fanart.tv dual-fetch
ed5118c fix: OMDB fallback now searches real movie keywords instead of '2024' title
ef55deb fix: restore page scrolling
8e1a978 Home Window, Setting page, Movie Page bug resolved
fed41f2 feat: add OMDB as temporary metadata fallback
829323b fix: resolve main process build error
d9e6b48 feat: Phase 3 polish — error boundaries, health indicators, player improvements
3766d76 feat: Phase 2 enhancements — subtitles, DM persistence, toast system, retry logic
4a0ef48 Package_Update
913ca0d feat: add all pages, App router, and README
ff4566b feat: add FilterBar, SearchOverlay, DownloadManager, SkeletonLoader components
9fc7064 feat: scaffold StreamVault - Electron + React + WebTorrent foundation
982c117 chore: initialize electron-vite project structure
```

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| Source files | 56 |
| Total lines | ~7,625 |
| Largest file | `index.css` (893 lines) |
| Pages | 6 |
| Components | 12 |
| Store modules | 4 |
| API services | 7 |
| Utility modules | 5 |
| CSS files | 13 |
| CSS custom properties | ~60 |
| Keyframe animations | 8 |
| API integrations | 6 (OMDb, Fanart.tv, Trakt.tv, YTS, EZTV, OpenSubtitles) |
| Keyboard shortcuts | 10 |
| Dependencies | 7 production + 5 dev |
| Commits on main | 17 |
