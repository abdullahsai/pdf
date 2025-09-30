import type { StudioMode } from '../store/types'

interface ToolbarProps {
  mode: StudioMode
  onModeChange: (mode: StudioMode) => void
  onImport: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onSelectAll: () => void
  onClearSelection: () => void
  onRotate: () => void
  onDelete: () => void
  onDuplicate: () => void
  onExport: () => void
  selectionCount: number
  totalPages: number
  isExporting: boolean
  extractSplit: boolean
  onToggleSplit: (value: boolean) => void
}

export function Toolbar({
  mode,
  onModeChange,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelectAll,
  onClearSelection,
  onRotate,
  onDelete,
  onDuplicate,
  onExport,
  selectionCount,
  totalPages,
  isExporting,
  extractSplit,
  onToggleSplit,
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <button type="button" className="secondary" onClick={onImport}>
          Import PDFs
        </button>
        <div className="mode-switch">
          <button
            type="button"
            className={mode === 'merge' ? 'active' : ''}
            onClick={() => onModeChange('merge')}
          >
            Merge
          </button>
          <button
            type="button"
            className={mode === 'extract' ? 'active' : ''}
            onClick={() => onModeChange('extract')}
          >
            Extract/Split
          </button>
        </div>
      </div>
      <div className="toolbar__group">
        <button type="button" className="secondary" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="secondary" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        <button type="button" className="secondary" onClick={onSelectAll} disabled={totalPages === 0}>
          Select all
        </button>
        <button type="button" className="secondary" onClick={onClearSelection} disabled={selectionCount === 0}>
          Clear
        </button>
        <button type="button" className="secondary" onClick={onRotate} disabled={selectionCount === 0 && totalPages === 0}>
          Rotate 90°
        </button>
        <button type="button" className="secondary" onClick={onDuplicate} disabled={selectionCount === 0 && totalPages === 0}>
          Duplicate
        </button>
        <button type="button" className="secondary" onClick={onDelete} disabled={selectionCount === 0 && totalPages === 0}>
          Delete
        </button>
      </div>
      <div className="toolbar__group toolbar__group--right">
        {mode === 'extract' && (
          <label className="toggle">
            <input
              type="checkbox"
              checked={extractSplit}
              onChange={(event) => onToggleSplit(event.target.checked)}
            />
            <span>Export each selection group separately</span>
          </label>
        )}
        <button type="button" className="primary" onClick={onExport} disabled={totalPages === 0 || isExporting}>
          {isExporting ? 'Exporting…' : 'Export'}
        </button>
      </div>
    </header>
  )
}
