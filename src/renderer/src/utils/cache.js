const CACHE_PREFIX = 'sv_cache_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

export function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null

    const { data, expiry } = JSON.parse(raw)
    if (Date.now() > expiry) {
      localStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function setCache(key, data, ttl = DEFAULT_TTL) {
  try {
    const entry = {
      data,
      expiry: Date.now() + ttl
    }
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // localStorage full — clear old cache entries
    clearExpiredCache()
  }
}

export function clearExpiredCache() {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      try {
        const { expiry } = JSON.parse(localStorage.getItem(key))
        if (Date.now() > expiry) {
          localStorage.removeItem(key)
        }
      } catch {
        localStorage.removeItem(key)
      }
    }
  })
}

export function clearAllCache() {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}
