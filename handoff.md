# 🤝 CinePeer — Handoff Document

> **Date**: 2026-06-07
> **Project**: Electron 31 + React 18 + Vite 5 + WebTorrent 2.5 + Zustand 4.5
> **Repository**: `/home/hero/CinePeer`

---

## 1. Current State

### What's Working
- **Build**: ✅ `npm run build` passes clean (one informational warning about dynamic import chunking, harmless)
- **Metadata pipeline**: TMDB-first with OMDb fallback, Trakt.tv for optional discovery, Fanart.tv for optional HD images
- **Torrent sources**: YTS API (movies) fixed at `movies-api.accel.li/api/v2`, EZTV (TV) fixed at `eztv.wf/api`
- **Movie posters**: CSP updated to allow `yts.bz`/`img.yts.bz` images
- **Year filter**: Now correctly passes `year` param to YTS API
- **Subtitle search**: Accepts optional `type` param (no longer hardcoded to `'movie'`)
- **SRT→WebVTT**: Now only replaces commas in timestamps, not subtitle text
- **YTS→TMDB ID mapping**: YTS-sourced movies use IMDb ID lookup to find correct TMDB entry
- **TV season grouping**: Episodes grouped by season in collapsible sections (latest season expanded by default)
- **Hover-reveal cards**: 300ms delayed, GPU-accelerated hover animation with blur, play button, expanded details

### Build Status
✅ `npm run build` — passes clean. One informational warning about dynamic import chunking (harmless).

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

### Torrent Source Priority
- **Movies**: YTS API → `https://movies-api.accel.li/api/v2`
- **TV Shows**: EZTV API → `https://eztv.wf/api`

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

### `services/yts.js`

```
listMovies(params)              searchByImdbId(imdbId)
getMovieDetails(movieId)        getMovieSuggestions(movieId)
```

### `services/eztv.js`

```
getTorrents({ imdbId, limit, page })
```

### `services/opensubtitles.js`

```
searchSubtitles({ imdbId, language, page, type })  — type is optional
downloadSubtitle(fileId)
getSubtitleLanguages(imdbId)
validateOsApiKey(key)
```

Internal helpers: `srtToWebVtt(srt)`, `webVttToDataUri(webvtt)`, `setApiKey(key)`

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
| `ytsBaseUrl` | `sv_yts_base_url` | `setYtsBaseUrl(url)` | Default: `https://movies-api.accel.li/api/v2` |
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
YTS_BASE_URL      = 'https://movies-api.accel.li/api/v2'     ← Updated 2026-06-07
EZTV_BASE_URL     = 'https://eztv.wf/api'                     ← Updated 2026-06-07
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
img-src:     ... https://image.tmdb.org https://yts.bz https://img.yts.bz ...
connect-src: ... https://movies-api.accel.li https://eztv.wf ...
```

---

## 8. Key Component Decisions

### MediaCard (`src/renderer/src/components/MediaCard.jsx`)
- **Hover state machine**: `isHovered` (instant) → 300ms delay → `isExpanded`
- **Timer cleanup**: `hoverTimerRef` + `mountedRef` pattern ensures no memory leaks
- **Expanded view**: base image blurs (`filter: blur(8px) brightness(0.5)`), overlay appears with play button, genres, overview
- **GPU**: `will-change: transform` on card, `will-change: transform, filter` on image
- **Zero layout shift**: only `transform: scale()` and `opacity` animated
- **Z-index**: hovered = 10, expanded = 100

### DetailModal (`src/renderer/src/components/DetailModal.jsx`)
- **Torrent fetching**: `selectedMediaType === 'movie'` → `searchByImdbId(imdbId)`, else → `getTorrents({ imdbId })`
- **TV season grouping**: `groupBySeason(torrents)` utility returns `[{season, episodes}]` sorted descending
- **Season expansion**: `expandedSeasons` (Set), latest season auto-expanded on mount
- **YTS ID detection**: if `selectedMedia.yts_data` exists, uses `lookupByExternalId(imdbId)` instead of passing YTS ID to TMDB directly
- **Health colors**: `excellent(🟢100+)` / `good(🔵30-99)` / `okay(🟡5-29)` / `low(🟠1-4)` / `dead(🔴0)`

### PlayerPage (`src/renderer/src/pages/PlayerPage.jsx`)
- Streams via WebTorrent in Electron's main process
- Subtitles fetched from OpenSubtitles using `currentStream.imdb_id` or `currentStream.mediaInfo?.imdb_id`
- Subtitle `type` param not yet passed (will be `'episode'` for TV)

---

## 9. Bugs Found & Fixed (2026-06-07 Session)

| # | Bug | Fix |
|---|-----|-----|
| 1 | YTS `yts.mx` NXDOMAIN — all movie torrents failed | Changed to `movies-api.accel.li/api/v2` |
| 2 | EZTV `eztv.re` Cloudflare-blocked — all TV torrents failed | Changed to `eztv.wf/api` |
| 3 | Movie posters blocked by CSP (images on `yts.bz`) | Added `yts.bz` and `img.yts.bz` to `img-src` |
| 4 | Year filter passed `minimum_rating=0` instead of year | Changed to `params.year = filters.year` |
| 5 | Subtitle search always `type='movie'` — TV subs unfindable | Made `type` optional, caller decides |
| 6 | SRT parser replaced ALL commas with dots | Regex `(\d{2}:\d{2}:\d{2}),(\d{3})` targets only timestamps |
| 7 | YTS movie IDs silently mapped to wrong TMDB entries | YTS items use `lookupByExternalId(imdbId)` first |

---

## 10. Known Issues / Next Steps

### 🟡 Features to Build

1. **Bandwidth limit enforcement** — `maxDownloadSpeed` stored but never passed to WebTorrent's `downloadLimit` option in `TorrentManager` (`src/main/index.js:14`)
2. **Continue watching** — Save playback position per title and offer resume
3. **Playback speed control** — 0.5x–2x in PlayerPage
4. **TV show full episode browsing** — Currently shows are browsable by category and episodes appear in DetailModal grouped by season, but not playable per-episode via a dedicated season/episode selector page

### 🟢 Housekeeping

1. **Remove `out/` from version control** — Build output shouldn't be tracked (check `.gitignore`)
2. **Seed a `.env` file** — User has a TMDB API key ready; could populate `.env` with `VITE_TMDB_API_KEY=xxx` for dev convenience
3. **Remove `handoff.md` from tracking** — Currently tracked in git, should be `.gitignore`d

---

## 11. Troubleshooting Tips

- **Settings don't trigger setup redirect**: `isSetupComplete` checks `sv_tmdb_api_key` in localStorage. If you enter an OMDb key without a TMDB key, setup won't clear — intentional (TMDB is required).
- **Black posters with TMDB**: TMDB returns relative paths like `/abc123.jpg`. `getPosterUrl` detects these and constructs the full `https://image.tmdb.org/t/p/w342/abc123.jpg` URL. If you see broken images, CSP might be blocking `image.tmdb.org`.
- **Mixed content warnings**: TMDB API is HTTPS, its image CDN is HTTPS. No mixed-content issues expected.
- **Build errors**: The `external: ['webtorrent']` in `electron.vite.config.mjs` is required because WebTorrent is a native module.
- **Images blocked**: Check CSP in `src/main/index.js` — add any new image-serving domains to `img-src`.
- **Wrong movie details**: If a YTS movie shows wrong details, ensure `yts_data` is present on the media object so DetailModal uses the IMDb lookup path.
- **Hover card not expanding**: Check that `mountedRef.current` is still `true` when the 300ms timer fires.
