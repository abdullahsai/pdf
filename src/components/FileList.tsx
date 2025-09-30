import type { SourceFileState } from '../store/types'

interface FileListProps {
  files: SourceFileState[]
  onRemove: (id: string) => void
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) {
    return null
  }
  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={file.id} className={`file-list__item file-list__item--${file.status}`}>
          <div className="file-list__details">
            <strong>{file.name}</strong>
            <span>
              {file.pageCount} pages · {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
            {file.metadata?.title && <span className="file-list__meta">Title: {file.metadata.title}</span>}
          </div>
          <div className="file-list__status">
            {file.status === 'loading' && <span className="badge badge--info">Loading…</span>}
            {file.status === 'ready' && <span className="badge badge--success">Ready</span>}
            {file.status === 'password-required' && <span className="badge badge--warning">Password required</span>}
            {file.status === 'error' && <span className="badge badge--error">{file.error ?? 'Failed to load'}</span>}
          </div>
          <button type="button" className="secondary" onClick={() => onRemove(file.id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  )
}
