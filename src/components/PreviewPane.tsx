import { useEffect, useMemo, useState } from 'react'
import type { PageItem } from '../store/types'

interface PreviewPaneProps {
  page: PageItem | null
  onRotate: () => void
  onNavigate: (direction: 1 | -1) => void
  onRequestPreview: (page: PageItem) => void
}

export function PreviewPane({ page, onRotate, onNavigate, onRequestPreview }: PreviewPaneProps) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setZoom(1)
    if (page) {
      onRequestPreview(page)
    }
  }, [page, onRequestPreview])

  const displayOrientation = useMemo(() => {
    if (!page) return null
    const ratio = page.width / page.height
    if (ratio > 1.05) return 'Landscape'
    if (ratio < 0.95) return 'Portrait'
    return 'Square'
  }, [page])

  if (!page) {
    return (
      <aside className="preview-pane">
        <div className="preview-pane__empty">Select a page to preview</div>
      </aside>
    )
  }

  const imageUrl = page.previewUrl ?? page.thumbnailUrl

  return (
    <aside className="preview-pane">
      <div className="preview-pane__header">
        <h2>Preview</h2>
        <div className="preview-pane__controls">
          <button type="button" className="secondary" onClick={() => onNavigate(-1)}>
            ← Prev
          </button>
          <button type="button" className="secondary" onClick={() => onNavigate(1)}>
            Next →
          </button>
          <button type="button" className="secondary" onClick={onRotate}>
            Rotate 90°
          </button>
        </div>
      </div>
      <div className="preview-pane__viewport">
        {imageUrl ? (
          <img src={imageUrl} alt="Selected page" style={{ transform: `scale(${zoom})` }} />
        ) : (
          <div className="preview-pane__placeholder">Rendering preview…</div>
        )}
      </div>
      <div className="preview-pane__footer">
        <div className="preview-pane__meta">
          <span>Size: {Math.round(page.width)} × {Math.round(page.height)} pt</span>
          {displayOrientation && <span>Orientation: {displayOrientation}</span>}
          <span>Rotation: {page.rotation}°</span>
        </div>
        <div className="preview-pane__zoom">
          <label>
            Zoom
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
        </div>
      </div>
    </aside>
  )
}
