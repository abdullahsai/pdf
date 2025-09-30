import type { ExportState } from '../store/types'

interface StatusBarProps {
  totalPages: number
  selectedPages: number
  estimatedSize: string
  exportState: ExportState
}

export function StatusBar({ totalPages, selectedPages, estimatedSize, exportState }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <div className="status-bar__info">
        <span>Total pages: {totalPages}</span>
        <span>Selected: {selectedPages}</span>
        <span>Estimated output: {estimatedSize}</span>
      </div>
      <div className="status-bar__export">
        {exportState.status === 'running' && (
          <div className="progress">
            <div className="progress__bar" style={{ width: `${Math.round(exportState.progress * 100)}%` }} />
            <span>{Math.round(exportState.progress * 100)}%</span>
          </div>
        )}
        {exportState.status === 'error' && <span className="badge badge--error">{exportState.errorMessage ?? 'Export failed'}</span>}
        {exportState.status === 'done' && exportState.blobSize != null && (
          <span className="badge badge--success">Export ready · {(exportState.blobSize / (1024 * 1024)).toFixed(2)} MB</span>
        )}
      </div>
    </footer>
  )
}
