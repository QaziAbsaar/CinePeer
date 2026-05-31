import { SlidersHorizontal } from 'lucide-react'
import { YTS_GENRES, SORT_OPTIONS, QUALITY_OPTIONS, YEAR_OPTIONS } from '../utils/constants'
import useMediaStore from '../store/useMediaStore'
import './FilterBar.css'

export default function FilterBar() {
  const { filters, setFilter } = useMediaStore()

  return (
    <div className="filter-bar glass-card" id="filter-bar">
      <SlidersHorizontal size={18} className="filter-icon" />

      <div className="filter-group">
        <label className="filter-label">Sort by</label>
        <select
          className="select-styled"
          value={filters.sort_by}
          onChange={(e) => setFilter('sort_by', e.target.value)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Genre</label>
        <select
          className="select-styled"
          value={filters.genre}
          onChange={(e) => setFilter('genre', e.target.value)}
        >
          {YTS_GENRES.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Year</label>
        <select
          className="select-styled"
          value={filters.year}
          onChange={(e) => setFilter('year', e.target.value)}
        >
          {YEAR_OPTIONS.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Quality</label>
        <select
          className="select-styled"
          value={filters.quality}
          onChange={(e) => setFilter('quality', e.target.value)}
        >
          {QUALITY_OPTIONS.map(q => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
