# 🤝 CinePeer — Handoff Document

> **Date**: 2026-06-07
> **Project**: Electron 31 + React 18 + Vite 5 + WebTorrent 2.5 + Zustand 4.5
> **Repository**: `/home/hero/CinePeer`

---

## 1. Current State

### What Was Done This Session

Switched the metadata pipeline from **OMDb-only** back to **TMDB-first with OMDb fallback**. The project had been migrated away from TMDB in commit `b041fb5` (the file `services/tmdb.js` was overwritten with an OMDb+Trakt implementation). We restored TMDB as the primary source.

### Build Status
✅ `npm run build` — **passes clean**. No errors, one informational warning about dynamic import chunking (harmless).

---

## 2. Architecture — Metadata Pipeline

```
                   metadata.js (facade)
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
      TMDB key set?                  No TMDB key?
          │                               │
          ▼                               ▼
      tmdb.js (API client)          omdb.js (API client)
          │                               │
          │ (optional)                    │ (optional)
          ▼                               ▼
      Fanart.tv                      Trakt.tv (discovery)
      (HD image enrich)              + Fanart.tv (images)
```

### Source Priority
1. **TMDB** — selected automatically when `sv_tmdb_api_key` is set in localStorage
2. **Trakt.tv** — used for OMDb fallback discovery lists (if Client ID configured)
3. **OMDb** — text metadata fallback when TMDB fails or no TMDB key
4. **Fanart.tv** — optional HD image enhancement on any source

### Key Files

| File | Role | Lines |
|------|------|-------|
| `services/metadata.js` | **Facade** — all UI pages import from here | ~540 |
| `services/tmdb.js` | **TMDB API client** — axios, caching, retry | ~200 |
| `services/omdb.js` | **OMDb API client** — fallback metadata | ~190 |
| `services/trakt.js` | **Trakt.tv client** — optional discovery lists | ~235 |
| `services/opensubtitles.js` | **OpenSubtitles client** — subtitles | ~170 |
| `services/yts.js` | **YTS client** — movie torrent magnet links | ~105 |
| `services/eztv.js` | **EZTV client** — TV show torrent magnet links | ~95 |

---

## 3. Exported Functions & Variables

### `services/tmdb.js` — TMDB API Client

```
Endpoints                    Image Helpers                  Validation
─────────────────────        ─────────────────────         ─────────────
getTrending(mediaType,       getPosterUrl(path, size)       validateApiKey(key)
  timeWindow)                getBackdropUrl(path, size)
getPopularMovies(page)       getProfileUrl(path, size)
getTopRatedMovies(page)
getNowPlayingMovies(page)    External Lookup
getUpcomingMovies(page)      ─────────────────────
getPopularTV(page)           lookupByExternalId(imdbId,
getTopRatedTV(page)           source = 'imdb_id')
getOnTheAirTV(page)
discoverByGenre(mediaType,
  genreId, page)
searchMulti(query, page)
getDetails(id, mediaType)
getCredits(id, mediaType)
getVideos(id, mediaType)
getSimilar(id, mediaType)
```

### `services/metadata.js` — Facade (what UI actually imports)

Same function names as `tmdb.js` above, plus:

```
Source Tracking                  Key Validators
─────────────────────            ─────────────────────
getActiveSource()                validateApiKey(key)       → TMDB
isUsingOmdb()                    validateOmdbKey(key)      → OMDb
                                 validateFanartKey(key)    → Fanart.tv
                                 validateTraktKey(clientId)→ Trakt.tv
```

Active source values: `'tmdb'` | `'omdb'`

### `services/trakt.js`

```
Discovery Lists                 Internal (now exported)
─────────────────────           ─────────────────────
getTrendingMovies(page)         fetchList(endpoint, page,
getTrendingShows(page)            mediaType, limit)
getPopularMovies(page)
getPopularShows(page)
getTopRatedMovies(page)
getTopRatedShows(page)
getRecommendedMovies(page)
getRecommendedShows(page)
```

---

## 4. Store — `useAppStore` (Zustand)

### State & localStorage Keys

| State Property | localStorage Key | Setter | Notes |
|---|---|---|---|
| `tmdbApiKey` | `sv_tmdb_api_key` | `setTmdbApiKey(key)` | Controls `isSetupComplete` |
| `omdbApiKey` | `sv_omdb_api_key` | `setOmdbApiKey(key)` | Fallback only |
| `fanartApiKey` | `sv_fanart_api_key` | `setFanartApiKey(key)` | Optional image enhancer |
| `traktClientId` | `sv_trakt_client_id` | `setTraktClientId(id)` | Optional discovery |
| `defaultQuality` | `sv_default_quality` | `setDefaultQuality(q)` | Default: `'1080p'` |
| `downloadPath` | `sv_download_path` | `setDownloadPath(path)` | Custom save location |
| `ytsBaseUrl` | `sv_yts_base_url` | `setYtsBaseUrl(url)` | Default: `https://yts.mx/api/v2` |
| `subtitleLanguage` | `sv_subtitle_lang` | `setSubtitleLanguage(lang)` | Default: `'en'` |
| `maxDownloadSpeed` | `sv_max_download_speed` | `setMaxDownloadSpeed(speed)` | Default: `0` (unlimited) |
| `opensubtitlesApiKey` | `sv_opensubtitles_api_key` | `setOpensubtitlesApiKey(key)` | Optional |
| `subtitleEnabled` | `sv_subtitle_enabled` | `setSubtitleEnabled(bool)` | Default: `true` |
| — | — | `toggleSearch()` / `closeSearch()` | UI state |
| — | — | `toggleDownloadManager()` / `closeDownloadManager()` | UI state |

**`isSetupComplete`** — returns `true` if `sv_tmdb_api_key` exists in localStorage.

---

## 5. Settings Page — Input IDs & Handlers

### Sections (top to bottom)

| Section | Title | Input ID | Handler | Validates Against |
|---|---|---|---|---|
| 1 | **TMDB API Key** | `tmdb-api-key-input` | `handleTmdbValidate` | `/movie/popular` endpoint |
| 2 | **OMDb API Key (Fallback)** | `omdb-api-key-input` | `handleOmdbValidate` | OMDb `?i=tt1375666` |
| 3 | **Fanart.tv API Key** | `fanart-api-key-input` | `handleFanartValidate` | Fanart `/v3/movies/tt1375666` |
| 4 | **Trakt.tv Client ID** | `trakt-client-id-input` | `handleTraktValidate` | Trakt `/movies/trending` |
| 5 | **Default Quality** | `default-quality-select` | `setDefaultQuality` | — |
| 6 | **YTS API URL** | `yts-base-url-input` | `setYtsBaseUrl` | — |
| 7 | **Download Location** | `download-path-input` | `setDownloadPath` | Native folder picker |
| 8 | **Bandwidth Limit** | `bandwidth-limit-select` | `setMaxDownloadSpeed` | — |
| 9 | **Subtitles** | `opensubtitles-api-key-input` | inline handler | `/infos/user` endpoint |

Validation result CSS classes: `.validation-msg.success` (green) / `.validation-msg.error` (red).

---

## 6. Constants — `utils/constants.js`

### API URLs
```
TMDB_BASE_URL     = 'https://api.themoviedb.org/3'
TMDB_IMAGE_BASE   = 'https://image.tmdb.org/t/p'
FANART_BASE_URL   = 'https://webservice.fanart.tv/v3'
YTS_BASE_URL      = 'https://yts.mx/api/v2'
EZTV_BASE_URL     = 'https://eztv.re/api'
```

### Image Sizes
```
IMAGE_SIZES = {
  poster:   { small: 'w185', medium: 'w342', large: 'w500', original: 'original' },
  backdrop: { small: 'w300', large: 'w1280', original: 'original' },
  profile:  { small: 'w45', medium: 'w185', large: 'h632' }
}
```

### Image Helper Logic (in `metadata.js`)
- If `path` starts with `http` → pass through as-is (OMDb/Fanart full URLs)
- Otherwise → prepend `TMDB_IMAGE_BASE`/size (TMDB relative paths)

---

## 7. CSP — `src/main/index.js`

```
img-src:     ... https://image.tmdb.org
connect-src: ... https://api.themoviedb.org
```

---

## 8. Immediate Next Steps

### 🔴 Bugs to Fix

1. **Year filter bug** — `MoviesPage.jsx:36` sets `minimum_rating = 0` instead of filtering by `filters.year`
2. **TMDB dead code removal** — `services/tmdb.js` is now clean, but verify no stale references remain

### 🟡 Features to Build

1. **TV show episode browsing** — Currently shows are browsable by category but not playable per-episode. Need season/episode selector + individual episode streaming via EZTV
2. **Bandwidth limit enforcement** — `maxDownloadSpeed` stored but never passed to WebTorrent's `downloadLimit` option in `TorrentManager`
3. **Continue watching** — Save playback position per title and offer resume
4. **Playback speed control** — 0.5x–2x in PlayerPage

### 🟢 Housekeeping

1. **Remove `progress.md`** — or keep as living document; it contains the full project audit
2. **Seed a `.env` file** — User has a TMDB API key ready; could populate `.env` with `VITE_TMDB_API_KEY=xxx` for dev convenience
3. **Delete `out/` from version control** — Build output shouldn't be tracked (check `.gitignore`)
4. **Test TMDB key validation** — Try entering a key in Settings to confirm the full pipeline works end-to-end

---

## 9. Troubleshooting Tips

- **Settings don't trigger setup redirect**: `isSetupComplete` checks `sv_tmdb_api_key` in localStorage. If you enter an OMDb key without a TMDB key, setup won't clear — that's intentional (TMDB is required).
- **Black posters with TMDB**: TMDB returns relative paths like `/abc123.jpg`. `getPosterUrl` detects these and constructs the full `https://image.tmdb.org/t/p/w342/abc123.jpg` URL. If you see broken images, CSP might be blocking `image.tmdb.org`.
- **Mixed content warnings**: TMDB API is HTTPS, its image CDN is HTTPS. No mixed-content issues expected.
- **Build errors**: The `external: ['webtorrent']` in `electron.vite.config.mjs` is required because WebTorrent is a native module.
