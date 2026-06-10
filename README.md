<p align="center">
  <img src="https://img.shields.io/badge/Windows-Setup_Exe-0078D4?logo=windows&logoColor=white" />
  <img src="https://img.shields.io/badge/macOS-DMG-000000?logo=apple&logoColor=white" />
  <img src="https://img.shields.io/badge/Linux-AppImage-FCC624?logo=linux&logoColor=black" />
  <br/>
  <img src="https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
  <img src="https://img.shields.io/github/v/release/QaziAbsaar/CinePeer?color=ff6b6b&label=Latest%20Release" />
</p>

<pre align="center">
██████╗ ██╗███╗   ██╗███████╗██████╗ ███████╗███████╗██████╗ 
██╔════╝ ██║████╗  ██║██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗
██║      ██║██╔██╗ ██║█████╗  ██████╔╝█████╗  █████╗  ██████╔╝
██║      ██║██║╚██╗██║██╔══╝  ██╔═══╝ ██╔══╝  ██╔══╝  ██╔══██╗
╚██████╗ ██║██║ ╚████║███████╗██║     ███████╗███████╗██║  ██║
 ╚═════╝ ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝
</pre>

<p align="center">
  <strong>🎬 Stream movies instantly — no downloads, no ads, no subscriptions.</strong><br/>
  <em>Amazon Prime Video-style UI · Torrent streaming · 100% free & local</em>
</p>

<p align="center">
  <a href="#-how-to-install-windows">🪟 Windows</a> ·
  <a href="#-how-to-install-macos">🍎 macOS</a> ·
  <a href="#-how-to-install-linux">🐧 Linux</a> ·
  <a href="#-how-to-get-a-tmdb-api-key">🔑 Get TMDB API Key</a>
</p>

---

## ⚡ Quick Start (Non-Tech Users)

If you just want to **use** the app, jump straight to:

1. **[How to Install Windows](#-how-to-install-windows)** — download the `.exe` installer and run it
2. **[How to Get a TMDB API Key](#-how-to-get-a-tmdb-api-key)** — free 5-minute setup (no credit card)

The rest of this page is details for developers.

---

## 🖥️ How to Install (Windows)

> **Requirements:** Windows 10 or Windows 11, 64-bit. That's it.

### Step 1 — Download the Installer

1. Go to the **[Releases page](https://github.com/QaziAbsaar/CinePeer/releases)** (click here ☝️)
2. Look for the **latest release** (it will say "CinePeer v1.x.x" at the top)
3. Click the **▸ Assets** arrow to expand the file list
4. Click **`CinePeer Setup 1.x.x.exe`** to download it

### Step 2 — Run the Installer

1. Open the downloaded file (it's in your Downloads folder)
2. Windows might show a blue "Windows protected your PC" popup — click **"More info"** then **"Run anyway"** <br/>
   *(This happens because the app is not Microsoft-signed. It's safe — the source code is open for anyone to inspect)*
3. Choose your install location (or leave it as-is)
4. Check ✅ **Create a desktop shortcut**
5. Click **Install**

### Step 3 — Launch & Enjoy

1. Double-click the **CinePeer** icon on your desktop
2. The app will open and ask for your **TMDB API Key** —
   [follow this guide](#-how-to-get-a-tmdb-api-key) to get one free
3. Paste your key → click **Save** → start browsing movies! 🎉

---

## 🍎 How to Install (macOS)

1. Go to the **[Releases page](https://github.com/QaziAbsaar/CinePeer/releases)**
2. Download **`CinePeer-1.x.x.dmg`** (Intel) or **`CinePeer-1.x.x-arm64.dmg`** (Apple Silicon M1/M2/M3)
3. Open the `.dmg` file → drag **CinePeer** into your **Applications** folder
4. Open CinePeer from Applications
5. If macOS says it can't be opened: go to **System Settings → Privacy & Security** and click **"Open Anyway"**

---

## 🐧 How to Install (Linux)

1. Download **`CinePeer-1.x.x.AppImage`** from the **[Releases page](https://github.com/QaziAbsaar/CinePeer/releases)**
2. Right-click the file → **Properties → Permissions** → check **"Allow executing as program"**
3. Double-click to run

---

## 🔑 How to Get a TMDB API Key

CinePeer uses **TMDB** (The Movie Database) to fetch movie posters, descriptions, ratings, and more. You need a **free** API key. It takes ~5 minutes.

### Step 1 — Create a TMDB Account

> **Tip:** If a personal Gmail doesn't work for registration, use a **work or school email** — it usually goes through right away.

1. Go to **[https://www.themoviedb.org/signup](https://www.themoviedb.org/signup)**
2. Fill in your details:
   - **Email** — use any email (Gmail, Outlook, work email, etc.)
   - **Username** — pick something
   - **Password** — create one
   - Check the agreement box
3. Click **Sign Up**
4. Check your email inbox (and spam folder!) for a verification link — click it

### Step 2 — Request an API Key

1. Once logged in, go to **[https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)**
2. Under **"Request an API Key"**, click **"Create"** or the **Developer** option
3. For **"Type of Use"** select **"Desktop Application"** (or "Personal" if that's available)
4. Fill in:
   - **Application Name:** `CinePeer`
   - **Application URL:** `https://github.com/QaziAbsaar/CinePeer` (copy-paste this)
   - **Application Summary:** `Desktop movie streaming app using WebTorrent`
5. Agree to the terms and submit

### Step 3 — Copy Your Key

1. You'll see a long string of letters and numbers — that's your **API Key (v3 auth)** — click the copy icon
2. It looks something like: `e2a63b8f1c9d4e7a3f6b2c8d1e5f7a9b`

### Step 4 — Add the Key to CinePeer

1. Open CinePeer
2. On first launch, click the **Settings ⚙️** icon
3. Paste your API key into the **TMDB API Key** field
4. Click **Save** ✨

> **💡 Still stuck?**
> - Try a different email (work/school email works best if Gmail fails)
> - Make sure you verified your email address first
> - Still having issues? [Open an issue](https://github.com/QaziAbsaar/CinePeer/issues) and we'll help

---

## ✨ Features

- **🎬 Browse & Discover** — Trending, Popular, Top Rated, and genre-based browsing powered by TMDB
- **⚡ Torrent Streaming** — Stream movies directly via WebTorrent — watch immediately, no waiting for downloads
- **🎮 Full Video Player** — Custom controls, keyboard shortcuts, volume slider, fullscreen, buffering indicator, live download stats
- **🔍 Search** — Instant search across movies and TV shows
- **📋 Watchlist** — Save titles to watch later (saved on your computer)
- **📊 Download Manager** — Track active torrents with real-time progress, speed, and peer count
- **🎯 Filter & Sort** — Filter by genre, year, quality; sort by rating, date, seeds
- **⚙️ Settings** — TMDB API key, default quality, and more
- **🖤 Cinematic Dark UI** — Premium dark theme with glassmorphism and smooth animations

---

## 🏗️ Architecture (For Developers)

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

## 🚀 Development Setup

> Skip this if you just want to **use** the app — use the installer above.

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

### Build from Source

```bash
# All platforms
npm run dist

# Specific platform
npm run dist:win     # Windows only
npm run dist:mac     # macOS only
npm run dist:linux   # Linux only
```

## ⌨️ Keyboard Shortcuts (Video Player)

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

---

<p align="center">
  <strong>⭐ Like the project?</strong> <a href="https://github.com/QaziAbsaar/CinePeer">Star it on GitHub!</a><br/>
  <em>Built with ❤️ for movie lovers</em>
</p>
