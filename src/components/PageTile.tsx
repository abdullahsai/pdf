import { forwardRef } from 'react'
import type { PageItem } from '../store/types'

interface PageTileProps {
  page: PageItem
  isSelected: boolean
  sourceLabel: string
  onSelect: (modifiers: { shift: boolean; multi: boolean }) => void
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onFocus: () => void
}

export const PageTile = forwardRef<HTMLDivElement, PageTileProps>(
  ({ page, isSelected, sourceLabel, onSelect, onRotate, onDuplicate, onDelete, onFocus }, ref) => {
    const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
      event.preventDefault()
      const multi = event.metaKey || event.ctrlKey
      onSelect({ shift: event.shiftKey, multi })
      onFocus()
    }

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const multi = event.metaKey || event.ctrlKey
        onSelect({ shift: event.shiftKey, multi })
        onFocus()
      }
    }

    return (
      <div
        ref={ref}
        data-page-id={page.id}
        className={`page-tile${isSelected ? ' page-tile--selected' : ''}`}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="page-tile__preview">
          {page.thumbnailUrl ? (
            <img src={page.thumbnailUrl} alt={`Page ${page.originalIndex}`} />
          ) : (
            <div className="page-tile__placeholder">Page {page.originalIndex}</div>
          )}
          <div className="page-tile__overlay">
            <span className="page-tile__label">{sourceLabel}</span>
            <span className="page-tile__number">#{page.originalIndex}</span>
          </div>
        </div>
        <div className="page-tile__actions">
          <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onRotate() }} title="Rotate 90°">
            ⟳
          </button>
          <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onDuplicate() }} title="Duplicate">
            ⧉
          </button>
          <button type="button" className="tile-action" onClick={(event) => { event.stopPropagation(); onDelete() }} title="Delete">
            ✕
          </button>
        </div>
      </div>
    )
  },
)

PageTile.displayName = 'PageTile'
