import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="offline-banner" id="offline-banner">
      <WifiOff size={16} />
      You are offline. Some features may be unavailable.
    </div>
  )
}
