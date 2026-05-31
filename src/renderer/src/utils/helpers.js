/**
 * Utility helpers for the CinePeer renderer process.
 * Re-exports formatting utilities from constants for convenience,
 * plus additional app-wide helper functions.
 */

export {
  formatBytes,
  formatSpeed,
  formatDuration,
  formatTimeRemaining
} from './constants'

/**
 * Debounce a function call.
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * Truncate text with ellipsis.
 * @param {string} str - Input string
 * @param {number} maxLen - Maximum length
 * @returns {string}
 */
export function truncate(str, maxLen = 100) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen).trimEnd() + '…'
}

/**
 * Extract year from a date string.
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function extractYear(dateStr) {
  return (dateStr || '').substring(0, 4)
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Generate a unique ID (for toast notifications, etc.).
 */
let _id = 0
export function uid() {
  return `sv_${Date.now()}_${++_id}`
}
