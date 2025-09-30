import { useCallback, useEffect, useRef, useState } from 'react'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  registerBrowse?: (handler: () => void) => void
}

export function DropZone({ onFiles, registerBrowse }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      if (files.length > 0) {
        onFiles(files)
      }
    },
    [onFiles],
  )

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setDragging(true)
  }

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (event) => {
    if ((event.target as HTMLElement).contains(event.relatedTarget as Node)) return
    setDragging(false)
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.target.files) {
      handleFiles(event.target.files)
      event.target.value = ''
    }
  }

  useEffect(() => {
    if (registerBrowse) {
      registerBrowse(() => {
        inputRef.current?.click()
      })
    }
  }, [registerBrowse])

  return (
    <div className={`drop-zone${isDragging ? ' drop-zone--dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <input ref={inputRef} type="file" accept="application/pdf" multiple onChange={handleInputChange} hidden />
      <div className="drop-zone__content">
        <p>Drag & drop PDFs here or</p>
        <button type="button" onClick={handleClick} className="secondary">
          Select files
        </button>
        <p className="privacy-note">All processing happens locally in your browser. Files never leave your device.</p>
      </div>
    </div>
  )
}
