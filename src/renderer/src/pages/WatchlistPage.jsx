import { Bookmark } from 'lucide-react'
import useMediaStore from '../store/useMediaStore'
import MediaCard from '../components/MediaCard'
import './WatchlistPage.css'

export default function WatchlistPage() {
  const { watchlist } = useMediaStore()

  return (
    <div className="page-container" id="watchlist-page">
      <div className="page-content">
        <h1 className="page-title font-display">My List</h1>

        {watchlist.length === 0 ? (
          <div className="watchlist-empty">
            <Bookmark size={56} />
            <h2>Your list is empty</h2>
            <p className="text-meta">
              Browse movies and TV shows, then add them to your list to watch later.
            </p>
          </div>
        ) : (
          <div className="media-grid">
            {watchlist.map((item) => (
              <MediaCard
                key={`${item.id}-${item.media_type}`}
                item={item}
                mediaType={item.media_type || 'movie'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
