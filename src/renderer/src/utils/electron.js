/**
 * Safe access to Electron APIs.
 * Returns fallback values when running outside Electron (e.g. in a browser for dev).
 */

const isElectron = typeof window !== 'undefined' && !!window.electron

/**
 * Safely call an Electron IPC method with fallback.
 * @param {string} channel - The IPC channel (e.g. 'torrent:add')
 * @param {string} method - The method on window.electron.*
 * @param {Array} args - Arguments to pass
 * @param {*} fallback - Fallback value if Electron is not available
 */
export async function electronInvoke(module, method, args = [], fallback = null) {
  try {
    if (isElectron && window.electron[module]?.[method]) {
      return await window.electron[module][method](...args)
    }
  } catch (e) {
    console.warn(`[Electron] ${module}.${method} failed:`, e.message)
  }
  return fallback
}

/**
 * Check if running inside Electron.
 */
export function isRunningInElectron() {
  return isElectron
}

/**
 * Get a compatible version string.
 */
export function getPlatform() {
  if (isElectron && window.electron.system) return 'electron'
  return 'browser'
}
