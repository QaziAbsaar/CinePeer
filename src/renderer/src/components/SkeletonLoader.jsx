import './SkeletonLoader.css'

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-poster shimmer" />
      <div className="skeleton-info">
        <div className="skeleton-title shimmer" />
        <div className="skeleton-meta shimmer" />
      </div>
    </div>
  )
}

export function SkeletonRow({ title = '', count = 8 }) {
  return (
    <div className="skeleton-row">
      <div className="skeleton-row-header">
        {title ? (
          <h2 className="text-section-title" style={{ opacity: 0.5 }}>{title}</h2>
        ) : (
          <div className="skeleton-row-title shimmer" />
        )}
      </div>
      <div className="scroll-row" style={{ paddingLeft: 'var(--page-padding)', paddingRight: 'var(--page-padding)' }}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonBanner() {
  return (
    <div className="skeleton-banner shimmer">
      <div className="skeleton-banner-content">
        <div className="skeleton-banner-title shimmer" />
        <div className="skeleton-banner-meta shimmer" />
        <div className="skeleton-banner-desc shimmer" />
        <div className="skeleton-banner-actions">
          <div className="skeleton-banner-btn shimmer" />
          <div className="skeleton-banner-btn shimmer" />
        </div>
      </div>
    </div>
  )
}
