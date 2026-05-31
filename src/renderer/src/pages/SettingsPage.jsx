import { useState } from 'react'
import { Settings, Key, FolderOpen, Monitor, Globe, Check, AlertCircle, Gauge, Subtitles } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { validateApiKey, validateOmdbKey } from '../services/metadata'
import { validateOsApiKey } from '../services/opensubtitles'
import { isUsingOmdb } from '../services/metadata'
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
    defaultQuality, setDefaultQuality,
    downloadPath, setDownloadPath,
    ytsBaseUrl, setYtsBaseUrl,
    maxDownloadSpeed, setMaxDownloadSpeed,
    opensubtitlesApiKey, setOpensubtitlesApiKey,
    omdbApiKey, setOmdbApiKey
  } = useAppStore()
  const addToast = useToastStore((s) => s.addToast)

  const [apiKeyInput, setApiKeyInput] = useState(tmdbApiKey)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null) // null | 'success' | 'error'
  const [subtitleKeyInput, setSubtitleKeyInput] = useState(opensubtitlesApiKey)
  const [subtitleValidating, setSubtitleValidating] = useState(false)
  const [subtitleValidationResult, setSubtitleValidationResult] = useState(null)

  const handleValidateAndSave = async () => {
    if (!apiKeyInput.trim()) return
    setValidating(true)
    setValidationResult(null)

    const isValid = await validateApiKey(apiKeyInput.trim())
    if (isValid) {
      setTmdbApiKey(apiKeyInput.trim())
      setValidationResult('success')
    } else {
      setValidationResult('error')
    }
    setValidating(false)
  }

  return (
    <div className="page-container" id="settings-page">
      <div className="page-content settings-content">
        <h1 className="page-title font-display">
          <Settings size={28} /> Settings
        </h1>

        {/* TMDB API Key */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Key size={20} />
            <div>
              <h2 className="settings-section-title">TMDB API Key</h2>
              <p className="text-meta">Required to fetch movie and TV show metadata, posters, and ratings.</p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your TMDB API key..."
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value)
                setValidationResult(null)
              }}
              id="tmdb-api-key-input"
            />
            <button
              className="btn btn-primary"
              onClick={handleValidateAndSave}
              disabled={validating || !apiKeyInput.trim()}
            >
              {validating ? <div className="spinner" /> : 'Save & Validate'}
            </button>
          </div>
          {validationResult === 'success' && (
            <div className="validation-msg success">
              <Check size={16} /> API key is valid and saved!
            </div>
          )}
          {validationResult === 'error' && (
            <div className="validation-msg error">
              <AlertCircle size={16} /> Invalid API key. Please check and try again.
            </div>
          )}
          <p className="settings-help text-small">
            Get a free API key at{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="settings-link">
              themoviedb.org/settings/api
            </a>
          </p>
        </section>

        {/* OMDB API Key (temporary fallback) */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Globe size={20} />
            <div>
              <h2 className="settings-section-title">OMDB API Key (Fallback)</h2>
              <p className="text-meta">
                Temporary fallback while your TMDB account is being verified.
                OMDB supports search + details only (no trending, genre discovery, or TV data).
              </p>
            </div>
          </div>
          <div className="settings-field-row">
            <input
              type="text"
              className="input-field"
              placeholder="Enter your OMDB API key..."
              value={omdbApiKey}
              onChange={(e) => setOmdbApiKey(e.target.value)}
              id="omdb-api-key-input"
            />
          </div>
          <p className="settings-help text-small">
            Get a free key at{' '}
            <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer" className="settings-link">
              omdbapi.com/apikey.aspx
            </a>
            {' '}— then paste it above. The app will auto-detect and use it when TMDB is unavailable.
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
            placeholder="https://yts.mx/api/v2"
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
              placeholder="Default: ~/Downloads/StreamVault"
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
          <h2 className="settings-section-title gradient-text">StreamVault</h2>
          <p className="text-meta">Version 1.0.0</p>
          <p className="settings-source-status">
            <span className={`source-dot ${isUsingOmdb() ? 'omdb' : 'tmdb'}`} />
            Metadata: <strong>{isUsingOmdb() ? 'OMDB (fallback)' : 'TMDB'}</strong>
            {isUsingOmdb() && (
              <span className="text-small" style={{ display: 'block', marginTop: 4 }}>
                Switch back when TMDB account is verified
              </span>
            )}
          </p>
          <p className="text-small" style={{ marginTop: 8 }}>
            A cinematic desktop streaming application. Built with Electron, React, and WebTorrent.
          </p>
        </section>
      </div>
    </div>
  )
}
