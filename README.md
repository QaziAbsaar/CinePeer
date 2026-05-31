<p align="center">
  <img src="https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/WebTorrent-2.5-E34F26?logo=webtorrent&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

<h1 align="center">🎬 StreamVault</h1>

<p align="center">
  <strong>A cinematic desktop streaming application</strong><br/>
  Amazon Prime Video-inspired UI · WebTorrent streaming · Zero ads · Fully local
</p>

---

## ✨ Features

- **Cinematic Dark UI** — Premium dark theme inspired by Amazon Prime Video with glassmorphism, gradients, and micro-animations
- **Browse & Discover** — Trending, Popular, Top Rated, and genre-based browsing powered by TMDB
- **Torrent Streaming** — Stream movies directly via WebTorrent with an in-app video player — no downloads needed before watching
- **Full Video Player** — Custom controls, keyboard shortcuts, volume slider, fullscreen, buffering indicator, and live download stats
- **Search** — Instant debounced multi-search across movies and TV shows
- **Watchlist** — Save titles to watch later, persisted locally
- **Download Manager** — Track active torrents with real-time progress, speed, and peer count
- **Filter & Sort** — Filter movies by genre, year, quality; sort by rating, date, seeds, and more
- **Settings** — Configure TMDB API key, default quality, YTS mirror URL
- **First-Launch Setup** — Guided setup flow to enter your TMDB API key on first run

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
│  │  • TMDB API calls    │   │  • File System Access     │ │
│  │  • React Router      │   │  • Window Management      │ │
│  └──────────────────────┘   └──────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
           │                            │
           ▼                            ▼
    ┌─────────────┐           ┌──────────────────┐
    │  TMDB API   │           │  YTS / EZTV API  │
    │  (metadata) │           │  (magnet links)  │
    └─────────────┘           └──────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ 
- A free [TMDB API key](https://www.themoviedb.org/settings/api)

### Installation

```bash
# Clone the repository
git clone https://github.com/QaziAbsaar/CinePeer.git
cd CinePeer

# Install dependencies
npm install

# Start in development mode
npm run dev
```

On first launch, StreamVault will redirect you to **Settings** where you'll paste your TMDB API key. Once saved, you're good to go.

### Build for Production

```bash
npm run build
```

## 🗂️ Project Structure

```
CinePeer/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.js             #   BrowserWindow, IPC, CSP
│   │   └── torrent.js           #   WebTorrent engine + HTTP streaming
│   ├── preload/
│   │   └── index.js             #   contextBridge IPC exposure
│   └── renderer/
│       ├── index.html           #   HTML shell
│       └── src/
│           ├── main.jsx         #   React entry point
│           ├── App.jsx          #   Router + global layout
│           ├── index.css        #   Design system (CSS vars, animations)
│           ├── components/      #   Reusable UI components
│           │   ├── Navbar
│           │   ├── MediaCard
│           │   ├── CategoryRow
│           │   ├── FeaturedBanner
│           │   ├── FilterBar
│           │   ├── DetailModal
│           │   ├── DownloadManager
│           │   ├── SearchOverlay
│           │   └── SkeletonLoader
│           ├── pages/           #   Route pages
│           │   ├── HomePage
│           │   ├── MoviesPage
│           │   ├── TVShowsPage
│           │   ├── PlayerPage
│           │   ├── WatchlistPage
│           │   └── SettingsPage
│           ├── services/        #   API clients
│           │   ├── tmdb.js      #     TMDB (metadata, images)
│           │   ├── yts.js       #     YTS (movie torrents)
│           │   └── eztv.js      #     EZTV (TV show torrents)
│           ├── store/           #   Zustand state management
│           │   ├── useAppStore
│           │   ├── useMediaStore
│           │   └── useTorrentStore
│           └── utils/           #   Helpers & constants
│               ├── constants.js
│               └── cache.js
├── electron.vite.config.mjs
├── package.json
└── .env                         # VITE_TMDB_API_KEY=your_key
```

## ⌨️ Keyboard Shortcuts (Player)

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `F` | Toggle fullscreen |
| `M` | Toggle mute |
| `←` | Seek back 10s |
| `→` | Seek forward 10s |
| `↑` | Volume up |
| `↓` | Volume down |
| `Esc` | Exit fullscreen / Go back |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 31 |
| Frontend | React 18 + Vite 5 |
| Routing | React Router v6 (HashRouter) |
| State | Zustand |
| Styling | Vanilla CSS (custom design system) |
| HTTP | Axios |
| Icons | Lucide React |
| Torrents | WebTorrent |
| Metadata | TMDB API v3 |
| Movie Torrents | YTS API v2 |
| TV Torrents | EZTV API |

## 📡 Data Flow

```
User clicks "Stream 1080p" on a movie
        │
        ▼
React → IPC → Main Process → WebTorrent.add(magnetUri)
        │
        ▼
WebTorrent streams to local HTTP server (random port)
        │
        ▼
Main process sends back: http://localhost:{port}
        │
        ▼
Player page: <video src="http://localhost:{port}" />
        │
        ▼
Video plays immediately while downloading in background
```

## ⚠️ Disclaimer

This application is intended for **educational and personal use only**. The developers do not host, distribute, or promote any copyrighted content. Users are solely responsible for ensuring their use of this application complies with all applicable laws in their jurisdiction. Use at your own risk.

## 📄 License

MIT © [QaziAbsaar](https://github.com/QaziAbsaar)
