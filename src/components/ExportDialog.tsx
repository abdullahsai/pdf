interface ExportDialogProps {
  open: boolean
  fileName: string
  blobUrl?: string
  onDownload: () => void
  onOpenNewTab: () => void
  onClose: () => void
}

export function ExportDialog({ open, fileName, blobUrl, onDownload, onOpenNewTab, onClose }: ExportDialogProps) {
  if (!open || !blobUrl) return null
  return (
    <div className="modal">
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__content">
        <h3>Export ready</h3>
        <p>Your PDF has been assembled as <strong>{fileName}</strong>.</p>
        <div className="modal__actions">
          <button type="button" className="primary" onClick={onDownload}>
            Download
          </button>
          <button type="button" className="secondary" onClick={onOpenNewTab}>
            Open in new tab
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
