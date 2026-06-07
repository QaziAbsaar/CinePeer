import { useState } from 'react'
import { Settings, Key, Image, FolderOpen, Monitor, Globe, Activity, Check, AlertCircle, Gauge, Subtitles } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { validateApiKey, validateOmdbKey, validateFanartKey, validateTraktKey } from '../services/metadata'
import { validateOsApiKey } from '../services/opensubtitles'
import { QUALITY_OPTIONS } from '../utils/constants'
import useToastStore from '../store/useToastStore'
import './SettingsPage.css'

const BANDWIDTH_OPTIONS = [
  { value: 0, label: 'Unlimited' },
  { value: 1024, label: '1 MB/s' },
  { value: 5120, label: '5 MB/s' },
  { value: 10240, label: '10 MB/s' },
  { value: 51200, label: '50 MB/s' }
]

export default function SettingsPage() {
  const {
    tmdbApiKey, setTmdbApiKey,
    omdbApiKey, setOmdbApiKey,
    fanartApiKey, setFanartApiKey,
    traktClientId, setTraktClientId,
    defaultQuality, setDefaultQuality,
    downloadPath, setDownloadPath,
    ytsBaseUrl, setYtsBaseUrl,
    maxDownloadSpeed, setMaxDownloadSpeed,
    opensubtitlesApiKey, setOpensubtitlesApiKey
  } = useAppStore()
  const addToast = useToastStore((s) => s.addToast)

  const [tmdbKeyInput, setTmdbKeyInput] = useState(tmdbApiKey)
  const [tmdbValidating, setTmdbValidating] = useState(false)
  const [tmdbValidationResult, setTmdbValidationResult] = useState(null)

  const [omdbKeyInput, setOmdbKeyInput] = useState(omdbApiKey)
  const [omdbValidating, setOmdbValidating] = useState(false)
  const [omdbValidationResult, setOmdbValidationResult] = useState(null)

  const [fanartKeyInput, setFanartKeyInput] = useState(fanartApiKey)
  const [fanartValidating, setFanartValidating] = useState(false)
  const [fanartValidationResult, setFanartValidationResult] = useState(null)

  const [traktKeyInput, setTraktKeyInput] = useState(traktClientId)
  const [traktValidating, setTraktValidating] = useState(false)
  const [traktValidationResult, setTraktValidationResult] = useState(null)

  const [subtitleKeyInput, setSubtitleKeyInput] = useState(opensubtitlesApiKey)
  const [subtitleValidating, setSubtitleValidating] = useState(false)
  const [subtitleValidationResult, setSubtitleValidationResult] = useState(null)

  const handleTmdbValidate = async () => {
    if (!tmdbKeyInput.trim()) return
    setTmdbValidating(true)
    setTmdbValidationResult(null)
    const isValid = await validateApiKey(tmdbKeyInput.trim())
    if (isValid) {
      setTmdbApiKey(tmdbKeyInput.trim())
      setTmdbValidationResult('success')
      addToast('TMDB API key saved!', 'success')
    } else {
      setTmdbValidationResult('error')
    }
    setTmdbValidating(false)
  }

  const handleOmdbValidate = async () => {
    if (!omdbKeyInput.trim()) return
    setOmdbValidating(true)
    setOmdbValidationResult(null)
    const isValid = await validateOmdbKey(omdbKeyInput.trim())
    if (isValid) {
      setOmdbApiKey(omdbKeyInput.trim())
      setOmdbValidationResult('success')
      addToast('OMDb API key saved!', 'success')
    } else {
      setOmdbValidationResult('error')
    }
    setOmdbValidating(false)
  }

  const handleTraktValidate = async () => {
    if (!traktKeyInput.trim()) return
    setTraktValidating(true)
    setTraktValidationResult(null)
    const isValid = await validateTraktKey(traktKeyInput.trim())
    if (isValid) {
      setTraktClientId(traktKeyInput.trim())
      setTraktValidationResult('success')
      addToast('Trakt.tv Client ID saved!', 'success')
    } else {
      setTraktValidationResult('error')
    }
    setTraktValidating(false)
  }

  const handleFanartValidate = async () => {
    if (!fanartKeyInput.trim()) return
    setFanartValidating(true)
    setFanartValidationResult(null)
    const isValid = await validateFanartKey(fanartKeyInput.trim())
    if (isValid) {
      setFanartApiKey(fanartKeyInput.trim())
      setFanartValidationResult('success')
      addToast('Fanart.tv API key saved!', 'success')
    } else {
      setFanartValidationResult('error')
    }
    setFanartValidating(false)
  }

  return (
    <div className="page-container" id="settings-page">
      <div className="page-content settings-content">
        <h1 className="page-title font-display">
          <Settings size={28} /> Settings
        </h1>

        {/* TMDB API Key (Primary) */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Globe size={20} />
            <div>
              <h2 className="settings-section-title">TMDB API Key</h2>
              <p className="text-meta">Required (primary). Provides full metadata, HD images, and rich discovery.</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your TMDB API key..."
              value={tmdbKeyInput}
              onChange={(e) => {
                setTmdbKeyInput(e.target.value)
                setTmdbValidationResult(null)
              }}
              id="tmdb-api-key-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleTmdbValidate}
              disabled={tmdbValidating || !tmdbKeyInput.trim()}
            >
              {tmdbValidating ? <div className="spinner" /> : 'Save & Validate'}
            </button>
          </div>
          {tmdbValidationResult === 'success' && (
            <div className="validation-msg success">
              <Check size={16} /> API key is valid and saved!
            </div>
          )}
          {tmdbValidationResult === 'error' && (
            <div className="validation-msg error">
              <AlertCircle size={16} /> Invalid API key. Please check and try again.
            </div>
          )}
          <p className="settings-help text-small">
            Get a free key at{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="settings-link">
              themoviedb.org/settings/api
            </a>
          </p>
        </section>

        {/* OMDb API Key (Fallback) */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Globe size={20} />
            <div>
              <h2 className="settings-section-title">OMDb API Key (Fallback)</h2>
              <p className="text-meta">Fallback when TMDB is unavailable. Provides basic metadata and poster images.</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your OMDb API key..."
              value={omdbKeyInput}
              onChange={(e) => {
                setOmdbKeyInput(e.target.value)
                setOmdbValidationResult(null)
              }}
              id="omdb-api-key-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleOmdbValidate}
              disabled={omdbValidating || !omdbKeyInput.trim()}
            >
              {omdbValidating ? <div className="spinner" /> : 'Save & Validate'}
            </button>
          </div>
          {omdbValidationResult === 'success' && (
            <div className="validation-msg success">
              <Check size={16} /> API key is valid and saved!
            </div>
          )}
          {omdbValidationResult === 'error' && (
            <div className="validation-msg error">
              <AlertCircle size={16} /> Invalid API key. Please check and try again.
            </div>
          )}
          <p className="settings-help text-small">
            Get a free key at{' '}
            <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer" className="settings-link">
              omdbapi.com/apikey.aspx
            </a>
          </p>
        </section>

        {/* Fanart.tv API Key (optional, for high-res images) */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Image size={20} />
            <div>
              <h2 className="settings-section-title">Fanart.tv API Key</h2>
              <p className="text-meta">Optional. Adds high-resolution posters and backgrounds. Without this, OMDb thumbnails are used.</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your Fanart.tv API key..."
              value={fanartKeyInput}
              onChange={(e) => {
                setFanartKeyInput(e.target.value)
                setFanartValidationResult(null)
              }}
              id="fanart-api-key-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleFanartValidate}
              disabled={fanartValidating || !fanartKeyInput.trim()}
            >
              {fanartValidating ? <div className="spinner" /> : 'Save & Validate'}
            </button>
          </div>
          {fanartValidationResult === 'success' && (
            <div className="validation-msg success">
              <Check size={16} /> API key is valid and saved!
            </div>
          )}
          {fanartValidationResult === 'error' && (
            <div className="validation-msg error">
              <AlertCircle size={16} /> Invalid API key. Please check and try again.
            </div>
          )}
          <p className="settings-help text-small">
            Get a free key at{' '}
            <a href="https://fanart.tv/get-an-api-key/" target="_blank" rel="noreferrer" className="settings-link">
              fanart.tv/get-an-api-key/
            </a>
          </p>
        </section>

        {/* Trakt.tv Client ID */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Activity size={20} />
            <div>
              <h2 className="settings-section-title">Trakt.tv Client ID</h2>
              <p className="text-meta">Required for Trending/Popular/Top-Rated discovery lists. Without this, OMDb keyword search is used (less accurate).</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your Trakt.tv Client ID..."
              value={traktKeyInput}
              onChange={(e) => {
                setTraktKeyInput(e.target.value)
                setTraktValidationResult(null)
              }}
              id="trakt-client-id-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleTraktValidate}
              disabled={traktValidating || !traktKeyInput.trim()}
            >
              {traktValidating ? <div className="spinner" /> : 'Save & Validate'}
            </button>
          </div>
          {traktValidationResult === 'success' && (
            <div className="validation-msg success">
              <Check size={16} /> Client ID is valid and saved!
            </div>
          )}
          {traktValidationResult === 'error' && (
            <div className="validation-msg error">
              <AlertCircle size={16} /> Invalid Client ID. Please check and try again.
            </div>
          )}
          <p className="settings-help text-small">
            Create a Trakt.tv app at{' '}
            <a href="https://trakt.tv/oauth/applications" target="_blank" rel="noreferrer" className="settings-link">
              trakt.tv/oauth/applications
            </a>
            {' '}— copy the Client ID.
          </p>
        </section>

        {/* Default Quality */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Monitor size={20} />
            <div>
              <h2 className="settings-section-title">Default Quality</h2>
              <p className="text-meta">Preferred video quality for streaming.</p>
            </div>
          </div>
          <select
            className="select-styled"
            value={defaultQuality}
            onChange={(e) => setDefaultQuality(e.target.value)}
            id="default-quality-select"
          >
            {QUALITY_OPTIONS.filter(q => q !== 'All').map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </section>

        {/* YTS Base URL */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Globe size={20} />
            <div>
              <h2 className="settings-section-title">YTS API URL</h2>
              <p className="text-meta">Base URL for the YTS movie API. Change if the default is blocked in your region.</p>
            </div>
          </div>
          <input
            type="text"
            className="input-field"
            value={ytsBaseUrl}
            onChange={(e) => setYtsBaseUrl(e.target.value)}
            placeholder="https://movies-api.accel.li/api/v2"
            id="yts-base-url-input"
          />
        </section>

        {/* Download Location */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <FolderOpen size={20} />
            <div>
              <h2 className="settings-section-title">Download Location</h2>
              <p className="text-meta">Where completed downloads are saved.</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              value={downloadPath}
              readOnly
              placeholder="Default: ~/Downloads/CinePeer"
              id="download-path-input"
            />
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const selected = await window.electron.system.selectDirectory()
                  if (selected) {
                    setDownloadPath(selected)
                    addToast('Download location updated', 'success')
                  }
                } catch {
                  // Not in Electron shell
                }
              }}
            >
              Browse
            </button>
          </div>
        </section>

        {/* Bandwidth Limit */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Gauge size={20} />
            <div>
              <h2 className="settings-section-title">Bandwidth Limit</h2>
              <p className="text-meta">Maximum download speed. Helps prevent saturating your connection.</p>
            </div>
          </div>
          <select
            className="select-styled"
            value={maxDownloadSpeed}
            onChange={(e) => setMaxDownloadSpeed(parseInt(e.target.value, 10))}
            id="bandwidth-limit-select"
          >
            {BANDWIDTH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </section>

        {/* OpenSubtitles API Key */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Subtitles size={20} />
            <div>
              <h2 className="settings-section-title">Subtitles (OpenSubtitles)</h2>
              <p className="text-meta">Optional. Add subtitle support to your streams. Get a free API key at opensubtitles.com.</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your OpenSubtitles API key..."
              value={subtitleKeyInput}
              onChange={(e) => {
                setSubtitleKeyInput(e.target.value)
                setSubtitleValidationResult(null)
              }}
              id="opensubtitles-api-key-input"
            />
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!subtitleKeyInput.trim()) return
                setSubtitleValidating(true)
                setSubtitleValidationResult(null)
                const isValid = await validateOsApiKey(subtitleKeyInput.trim())
                if (isValid) {
                  setOpensubtitlesApiKey(subtitleKeyInput.trim())
                  setSubtitleValidationResult('success')
                  addToast('OpenSubtitles API key saved!', 'success')
                } else {
                  setSubtitleValidationResult('error')
                }
                setSubtitleValidating(false)
              }}
              disabled={subtitleValidating || !subtitleKeyInput.trim()}
            >
              {subtitleValidating ? <div className="spinner" /> : 'Save & Validate'}
            </button>
          </div>
          {subtitleValidationResult === 'success' && (
            <div className="validation-msg success">
              <Check size={16} /> API key is valid! Subtitles will load during playback.
            </div>
          )}
          {subtitleValidationResult === 'error' && (
            <div className="validation-msg error">
              <AlertCircle size={16} /> Invalid API key. Please check and try again.
            </div>
          )}
          <p className="settings-help text-small">
            Get a free API key at{' '}
            <a href="https://opensubtitles.com" target="_blank" rel="noreferrer" className="settings-link">
              opensubtitles.com
            </a>
          </p>
        </section>

        {/* About */}
        <section className="settings-section glass-card settings-about">
          <h2 className="settings-section-title gradient-text">CinePeer</h2>
          <p className="text-meta">Version 1.0.0</p>
          <p className="settings-source-status">
            <span className="source-dot tmdb" />
            Metadata: <strong>TMDB → OMDb</strong>
          </p>
          <p className="text-small" style={{ marginTop: 8 }}>
            A cinematic desktop streaming application. Built with Electron, React, and WebTorrent.
          </p>
        </section>
      </div>
    </div>
  )
}
