/**
 * OpenSubtitles.com REST API v2 client.
 * Requires a free API key from https://opensubtitles.com
 * Subtitles are fetched by IMDB ID and rendered as WebVTT <track> elements.
 */

import axios from 'axios'

const OS_BASE_URL = 'https://api.opensubtitles.com/api/v1'
const OS_USER_AGENT = 'StreamVault v1.0'

let _apiKey = ''

export function setApiKey(key) {
  _apiKey = key
}

function getApiKey() {
  if (_apiKey) return _apiKey
  // Fall back to localStorage
  _apiKey = localStorage.getItem('sv_opensubtitles_api_key') || ''
  return _apiKey
}

const osApi = axios.create({
  baseURL: OS_BASE_URL,
  timeout: 15000,
  headers: {
    'User-Agent': OS_USER_AGENT,
    'Accept': 'application/json'
  }
})

// Request interceptor — append API key
osApi.interceptors.request.use((config) => {
  const key = getApiKey()
  if (key) {
    config.headers['Api-Key'] = key
  }
  return config
})

osApi.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[OpenSubtitles]', error.response?.status, error.message)
    throw error
  }
)

/**
 * Search for subtitles by IMDB ID.
 * @param {Object} params
 * @param {string} params.imdbId - e.g. 'tt1234567'
 * @param {string} [params.language='en'] - Language code (ISO 639-1)
 * @param {number} [params.page=1] - Page number
 */
export async function searchSubtitles({ imdbId, language = 'en', page = 1 }) {
  const cleanId = imdbId.replace(/^tt/, '')
  const data = await osApi.get('/subtitles', {
    params: {
      imdb_id: parseInt(cleanId, 10),
      languages: language,
      page,
      order_by: 'download_count',
      order_direction: 'desc',
      type: 'movie'
    }
  })
  return data
}

/**
 * Download a subtitle file and return its content as WebVTT.
 * @param {string} fileId - The subtitle file ID to download
 */
export async function downloadSubtitle(fileId) {
  // Step 1: Request download URL
  const downloadData = await osApi.post('/download', {
    file_id: fileId,
    sub_format: 'srt'
  })

  const downloadUrl = downloadData?.link
  if (!downloadUrl) throw new Error('No download link returned')

  // Step 2: Fetch the subtitle content
  const response = await axios.get(downloadUrl, {
    responseType: 'text',
    timeout: 30000
  })

  // Step 3: Convert SRT to WebVTT
  const webvtt = srtToWebVtt(response.data)
  return webvtt
}

/**
 * Convert SRT subtitle format to WebVTT.
 * SRT uses: 1\n00:00:01,000 --> 00:00:04,000\nText\n\n
 * WebVTT uses: WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nText\n\n
 */
function srtToWebVtt(srt) {
  if (!srt) return ''

  // Replace comma decimal separator with period in timestamps
  let vtt = srt
    .replace(/\r\n/g, '\n')
    .replace(/,/g, '.')

  // Ensure WEBVTT header
  if (!vtt.startsWith('WEBVTT')) {
    vtt = 'WEBVTT\n\n' + vtt
  }

  return vtt
}

/**
 * Create a data URI from WebVTT content for use in a <track> element.
 */
export function webVttToDataUri(webvtt) {
  const blob = new Blob([webvtt], { type: 'text/vtt' })
  return URL.createObjectURL(blob)
}

/**
 * Get available subtitle languages for a media item.
 */
export async function getSubtitleLanguages(imdbId) {
  try {
    const cleanId = imdbId.replace(/^tt/, '')
    const data = await osApi.get('/subtitles', {
      params: {
        imdb_id: parseInt(cleanId, 10),
        page: 1,
        order_by: 'download_count',
        order_direction: 'desc'
      }
    })

    const languages = new Set()
    for (const sub of (data.data || [])) {
      if (sub.attributes?.language) {
        languages.add(sub.attributes.language)
      }
    }
    return Array.from(languages)
  } catch {
    return []
  }
}

/**
 * Validate an OpenSubtitles API key by making a simple request.
 */
export async function validateOsApiKey(key) {
  try {
    await axios.get(`${OS_BASE_URL}/infos/user`, {
      headers: {
        'Api-Key': key,
        'User-Agent': OS_USER_AGENT
      },
      timeout: 5000
    })
    return true
  } catch {
    return false
  }
}
