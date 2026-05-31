import { useState } from 'react'
import { Settings, Key, Image, FolderOpen, Monitor, Globe, Check, AlertCircle, Gauge, Subtitles } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { validateOmdbKey, validateFanartKey } from '../services/metadata'
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
    omdbApiKey, setOmdbApiKey,
    fanartApiKey, setFanartApiKey,
    defaultQuality, setDefaultQuality,
    downloadPath, setDownloadPath,
    ytsBaseUrl, setYtsBaseUrl,
    maxDownloadSpeed, setMaxDownloadSpeed,
    opensubtitlesApiKey, setOpensubtitlesApiKey
  } = useAppStore()
  const addToast = useToastStore((s) => s.addToast)

  const [omdbKeyInput, setOmdbKeyInput] = useState(omdbApiKey)
  const [omdbValidating, setOmdbValidating] = useState(false)
  const [omdbValidationResult, setOmdbValidationResult] = useState(null)

  const [fanartKeyInput, setFanartKeyInput] = useState(fanartApiKey)
  const [fanartValidating, setFanartValidating] = useState(false)
  const [fanartValidationResult, setFanartValidationResult] = useState(null)

  const [subtitleKeyInput, setSubtitleKeyInput] = useState(opensubtitlesApiKey)
  const [subtitleValidating, setSubtitleValidating] = useState(false)
  const [subtitleValidationResult, setSubtitleValidationResult] = useState(null)

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

        {/* OMDb API Key */}
        <section className="settings-section glass-card">
          <div className="settings-section-header">
            <Globe size={20} />
            <div>
              <h2 className="settings-section-title">OMDb API Key</h2>
              <p className="text-meta">Required. Provides movie/TV metadata: titles, plot, ratings, and poster images.</p>
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
            <span className="source-dot omdb" />
            Metadata: <strong>OMDb + Fanart.tv</strong>
          </p>
          <p className="text-small" style={{ marginTop: 8 }}>
            A cinematic desktop streaming application. Built with Electron, React, and WebTorrent.
          </p>
        </section>
      </div>
    </div>
  )
}
