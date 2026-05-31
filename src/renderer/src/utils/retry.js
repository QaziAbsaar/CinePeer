/**
 * Axios response interceptor that retries failed requests
 * with exponential backoff.
 */

const MAX_RETRIES = 2
const INITIAL_DELAY = 1000 // 1 second

// Status codes that are safe to retry
const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504]

// Network errors (no response) are also retryable
const isRetryable = (error) => {
  if (!error.config) return false
  // Don't retry if already retried up to limit
  if (error.config.__retryCount >= MAX_RETRIES) return false
  // Retry on network error (no response) or retryable status
  if (!error.response) return true
  return RETRYABLE_STATUSES.includes(error.response.status)
}

export function setupRetryInterceptor(axiosInstance, serviceName = 'API') {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (!isRetryable(error)) throw error

      const config = error.config
      config.__retryCount = (config.__retryCount || 0) + 1
      const delay = INITIAL_DELAY * Math.pow(2, config.__retryCount - 1)

      console.warn(
        `[${serviceName}] Retry ${config.__retryCount}/${MAX_RETRIES}`,
        `after ${delay}ms (${error.response?.status || 'network error'})`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      return axiosInstance(config)
    }
  )
}
