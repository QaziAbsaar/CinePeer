import { useState } from 'react'
import { Settings, Key, FolderOpen, Monitor, Globe, Check, AlertCircle } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { validateApiKey } from '../services/tmdb'
import { QUALITY_OPTIONS } from '../utils/constants'
import './SettingsPage.css'

export default function SettingsPage() {
  const {
    tmdbApiKey, setTmdbApiKey,
    defaultQuality, setDefaultQuality,
    downloadPath, setDownloadPath,
    ytsBaseUrl, setYtsBaseUrl
  } = useAppStore()

  const [apiKeyInput, setApiKeyInput] = useState(tmdbApiKey)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null) // null | 'success' | 'error'

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

        {/* About */}
        <section className="settings-section glass-card settings-about">
          <h2 className="settings-section-title gradient-text">StreamVault</h2>
          <p className="text-meta">Version 1.0.0</p>
          <p className="text-small" style={{ marginTop: 8 }}>
            A cinematic desktop streaming application. Built with Electron, React, and WebTorrent.
          </p>
        </section>
      </div>
    </div>
  )
}
