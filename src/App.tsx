import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { FileList } from './components/FileList'
import { PasswordPrompt } from './components/PasswordPrompt'
import { PageGrid } from './components/PageGrid'
import { PreviewPane } from './components/PreviewPane'
import { ExportDialog } from './components/ExportDialog'
import { StatusBar } from './components/StatusBar'
import { ToastStack, type Toast } from './components/ToastStack'
import { Toolbar } from './components/Toolbar'
import { useAssemblyWorker } from './hooks/useAssemblyWorker'
import { useReaderWorker } from './hooks/useReaderWorker'
import { StudioProvider, useStudioDispatch, useStudioState, useTimeline } from './store/StudioProvider'
import { useStudioActions } from './store/useStudioActions'
import type { PageItem } from './store/types'
import { createId } from './utils/id'
import { deleteFromOPFS, storeFile } from './utils/fileStore'
import type { AssemblyWorkerResponse, ReaderWorkerResponse } from './workers/types/messages'

function computeOrientation(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  const ratio = width / height
  if (ratio > 1.05) return 'landscape'
  if (ratio < 0.95) return 'portrait'
  return 'square'
}

function formatEstimatedSize(pages: PageItem[]): string {
  if (pages.length === 0) return '0 MB'
  const areaSum = pages.reduce((total, page) => total + page.width * page.height, 0)
  const estimatedBytes = areaSum * 0.25
  const megabytes = estimatedBytes / (1024 * 1024)
  if (megabytes < 0.1) return '<0.1 MB'
  return `${megabytes.toFixed(2)} MB`
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function StudioApp() {
  const state = useStudioState()
  const dispatch = useStudioDispatch()
  const actions = useStudioActions()
  const timeline = useTimeline()
  const readerCallbacks = useRef(new Map<string, { expected: number; pages: PageItem[]; received: number }>())
  const expectedCounts = useRef(new Map<string, number>())
  const objectUrls = useRef(new Map<string, string>())
  const previewUrls = useRef(new Map<string, string>())
  const [toasts, setToasts] = useState<Toast[]>([])
  const [passwordPrompt, setPasswordPrompt] = useState<{ sourceId: string; requestId: string; reason: 'need' | 'incorrect' } | null>(null)
  const [browseHandler, setBrowseHandler] = useState<() => void>(() => {})
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const exportJobs = useRef(
    new Map<
      string,
      {
        resolve: (blob: Blob) => void
        reject: (reason: string) => void
        groupIndex: number
        totalGroups: number
        fileName: string
      }
    >(),
  )
  const requestedPreviews = useRef(new Set<string>())
  const requestedThumbnails = useRef(new Set<string>())
  const stateRef = useRef(state)
  const timelineRef = useRef(timeline)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  useEffect(() => {
    timelineRef.current = timeline
  }, [timeline])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = createId('toast')
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 6000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const reader = useReaderWorker(
    useCallback(
      (message: ReaderWorkerResponse) => {
        switch (message.type) {
          case 'file-info': {
            expectedCounts.current.set(message.sourceId, message.pageCount)
            dispatch({ type: 'SET_FILE_PAGE_COUNT', sourceId: message.sourceId, pageCount: message.pageCount })
            dispatch({ type: 'SET_FILE_METADATA', sourceId: message.sourceId, metadata: message.metadata })
            break
          }
          case 'page-ready': {
            const sourceName = stateRef.current.files[message.sourceId]?.name ?? 'Document'
            const rotation = ((message.rotation % 360) + 360) % 360
            const pageId = createId('page')
            dispatch({ type: 'MAP_PAGE_ID', sourceId: message.sourceId, pageIndex: message.pageIndex, pageId })
            let thumbnailUrl: string | undefined
            if (message.thumbnailBuffer) {
              const blob = new Blob([message.thumbnailBuffer], { type: message.thumbnailType ?? 'image/webp' })
              thumbnailUrl = URL.createObjectURL(blob)
              const existing = objectUrls.current.get(pageId)
              if (existing) URL.revokeObjectURL(existing)
              objectUrls.current.set(pageId, thumbnailUrl)
            }
            const page: PageItem = {
              id: pageId,
              sourceId: message.sourceId,
              sourceName,
              originalIndex: message.pageIndex,
              rotation,
              width: message.width,
              height: message.height,
              orientation: computeOrientation(message.width, message.height),
              thumbnailUrl,
            }
            const entry = readerCallbacks.current.get(message.sourceId) ?? {
              expected: expectedCounts.current.get(message.sourceId) ?? 0,
              pages: [],
              received: 0,
            }
            entry.pages.push(page)
            entry.received += 1
            readerCallbacks.current.set(message.sourceId, entry)
            if (entry.received === entry.expected) {
              readerCallbacks.current.delete(message.sourceId)
              dispatch({ type: 'PUSH_PAGES', pages: entry.pages })
              dispatch({ type: 'UPDATE_FILE_STATUS', sourceId: message.sourceId, status: 'ready' })
            }
            break
          }
          case 'thumbnail-ready': {
            const pageId = stateRef.current.files[message.sourceId]?.pageIds[message.pageIndex - 1]
            if (!pageId) break
            const blob = new Blob([message.buffer], { type: message.mimeType })
            const url = URL.createObjectURL(blob)
            const existing = objectUrls.current.get(pageId)
            if (existing) URL.revokeObjectURL(existing)
            objectUrls.current.set(pageId, url)
            dispatch({ type: 'SET_THUMBNAIL', pageId, thumbnailUrl: url })
            break
          }
          case 'preview-ready': {
            const pageId = stateRef.current.files[message.sourceId]?.pageIds[message.pageIndex - 1]
            if (!pageId) break
            const blob = new Blob([message.buffer], { type: message.mimeType })
            const url = URL.createObjectURL(blob)
            const existing = previewUrls.current.get(pageId)
            if (existing) URL.revokeObjectURL(existing)
            previewUrls.current.set(pageId, url)
            dispatch({ type: 'SET_PREVIEW', pageId, previewUrl: url })
            break
          }
          case 'password-required': {
            dispatch({ type: 'UPDATE_FILE_STATUS', sourceId: message.sourceId, status: 'password-required' })
            setPasswordPrompt({ sourceId: message.sourceId, requestId: message.requestId, reason: message.reason })
            break
          }
          case 'file-error': {
            dispatch({ type: 'UPDATE_FILE_STATUS', sourceId: message.sourceId, status: 'error', error: message.message })
            addToast('error', message.message)
            break
          }
          default:
            break
        }
      },
      [addToast, dispatch],
    ),
  )

  const assembly = useAssemblyWorker(
    useCallback(
      (message: AssemblyWorkerResponse) => {
        switch (message.type) {
          case 'progress': {
            const job = exportJobs.current.get(message.jobId)
            if (job) {
              const overall = job.totalGroups === 0 ? 1 : (job.groupIndex + message.value) / job.totalGroups
              dispatch({ type: 'SET_EXPORT_STATE', exportState: { status: 'running', progress: overall } })
            }
            break
          }
          case 'result': {
            const job = exportJobs.current.get(message.jobId)
            if (job) {
              const blob = new Blob([message.buffer], { type: 'application/pdf' })
              job.resolve(blob)
              exportJobs.current.delete(message.jobId)
            }
            break
          }
          case 'error': {
            const job = exportJobs.current.get(message.jobId)
            if (job) {
              job.reject(message.message)
              exportJobs.current.delete(message.jobId)
            }
            dispatch({ type: 'SET_EXPORT_STATE', exportState: { status: 'error', progress: 0, errorMessage: message.message } })
            addToast('error', message.message)
            break
          }
          default:
            break
        }
      },
      [addToast, dispatch],
    ),
  )

  const handleFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const sourceId = createId('src')
        try {
          const storage = await storeFile(file)
          dispatch({
            type: 'REGISTER_FILE',
            file: {
              id: sourceId,
              name: file.name,
              size: file.size,
              status: 'loading',
              pageCount: 0,
              storage,
              error: undefined,
              useOPFS: storage.type === 'opfs',
              pageIds: [],
            },
          })
          const requestId = createId('load')
          reader.loadPdf({
            sourceId,
            requestId,
            file: { ...storage, size: file.size, name: file.name },
            eagerThumbnailCount: 8,
          })
        } catch (error) {
          addToast('error', error instanceof Error ? error.message : 'Failed to read file')
        }
      }
    },
    [addToast, dispatch, reader],
  )

  const handlePasswordSubmit = useCallback(
    (password: string | null) => {
      if (!passwordPrompt) return
      if (password) {
        dispatch({ type: 'UPDATE_FILE_STATUS', sourceId: passwordPrompt.sourceId, status: 'loading' })
        reader.providePassword(passwordPrompt.sourceId, passwordPrompt.requestId, password)
      } else {
        dispatch({ type: 'UPDATE_FILE_STATUS', sourceId: passwordPrompt.sourceId, status: 'error', error: 'Password required' })
        addToast('error', 'Skipped password-protected file.')
      }
      setPasswordPrompt(null)
    },
    [addToast, dispatch, passwordPrompt, reader],
  )

  const cleanupUrls = useCallback(() => {
    for (const url of objectUrls.current.values()) {
      URL.revokeObjectURL(url)
    }
    for (const url of previewUrls.current.values()) {
      URL.revokeObjectURL(url)
    }
    objectUrls.current.clear()
    previewUrls.current.clear()
  }, [])

  useEffect(() => cleanupUrls, [cleanupUrls])

  useEffect(() => {
    const timelineIds = new Set(timeline.pages.map((page) => page.id))
    for (const [id, url] of objectUrls.current) {
      if (!timelineIds.has(id)) {
        URL.revokeObjectURL(url)
        objectUrls.current.delete(id)
      }
    }
    for (const [id, url] of previewUrls.current) {
      if (!timelineIds.has(id)) {
        URL.revokeObjectURL(url)
        previewUrls.current.delete(id)
        requestedPreviews.current.delete(id)
      }
    }
  }, [timeline.pages])

  const handleRemoveFile = useCallback(
    async (sourceId: string) => {
      const file = stateRef.current.files[sourceId]
      if (!file) return
      if (file.storage.type === 'opfs') {
        try {
          await deleteFromOPFS(file.storage.path)
        } catch (error) {
          console.warn('Failed to remove OPFS file', error)
        }
      }
      dispatch({ type: 'REMOVE_FILE', sourceId })
      addToast('info', `${file.name} removed.`)
    },
    [addToast, dispatch],
  )

  const handleRequestThumbnail = useCallback(
    (page: PageItem) => {
      if (page.thumbnailUrl) return
      if (requestedThumbnails.current.has(page.id)) return
      requestedThumbnails.current.add(page.id)
      const requestId = createId('thumb')
      reader.renderThumbnail({ sourceId: page.sourceId, pageIndex: page.originalIndex, requestId, maxPixels: 400 })
    },
    [reader],
  )

  const handleRequestPreview = useCallback(
    (page: PageItem) => {
      if (page.previewUrl) return
      if (requestedPreviews.current.has(page.id)) return
      requestedPreviews.current.add(page.id)
      const requestId = createId('preview')
      reader.renderPreview({ sourceId: page.sourceId, pageIndex: page.originalIndex, requestId, maxPixels: 1600 })
    },
    [reader],
  )

  const runAssembly = useCallback(
    (pages: PageItem[], fileName: string, groupIndex: number, totalGroups: number) => {
      return new Promise<Blob>((resolve, reject) => {
        if (pages.length === 0) {
          resolve(new Blob())
          return
        }
        const jobId = createId('job')
        exportJobs.current.set(jobId, { resolve, reject, groupIndex, totalGroups, fileName })
        const uniqueSources = new Set(pages.map((page) => page.sourceId))
        const sources: Record<string, (typeof stateRef.current.files)[string]['storage'] & { size: number; name: string }> = {}
        for (const sourceId of uniqueSources) {
          const file = stateRef.current.files[sourceId]
          if (!file) {
            exportJobs.current.delete(jobId)
            reject(`Missing source for ${sourceId}`)
            return
          }
          sources[sourceId] = { ...file.storage, size: file.size, name: file.name }
        }
        assembly.assemble({
          jobId,
          fileName,
          sources,
          pages: pages.map((page) => ({
            pageId: page.id,
            sourceId: page.sourceId,
            sourcePageIndex: page.originalIndex,
            rotation: page.rotation,
          })),
        })
      })
    },
    [assembly],
  )

  const handleExport = useCallback(async () => {
    const currentTimeline = timelineRef.current
    if (currentTimeline.pages.length === 0) {
      addToast('error', 'No pages to export yet.')
      return
    }
    const mode = stateRef.current.mode
    const selection = currentTimeline.selection
    const indexMap = new Map(currentTimeline.pages.map((page, index) => [page.id, index]))
    let groups: PageItem[][]
    let baseName = 'document.pdf'
    if (mode === 'extract') {
      if (selection.length === 0) {
        addToast('error', 'Select pages to extract.')
        return
      }
      const selectedPages = currentTimeline.pages.filter((page) => selection.includes(page.id))
      const sorted = [...selectedPages].sort((a, b) => (indexMap.get(a.id)! - indexMap.get(b.id)!))
      if (stateRef.current.extractOptions.splitIntoGroups) {
        groups = []
        let bucket: PageItem[] = []
        sorted.forEach((page, idx) => {
          if (idx === 0) {
            bucket = [page]
            return
          }
          const previous = sorted[idx - 1]
          if ((indexMap.get(page.id) ?? 0) === (indexMap.get(previous.id) ?? 0) + 1) {
            bucket.push(page)
          } else {
            groups.push(bucket)
            bucket = [page]
          }
        })
        if (bucket.length > 0) groups.push(bucket)
      } else {
        groups = [sorted]
      }
      baseName = 'extracted.pdf'
    } else {
      groups = [currentTimeline.pages]
      baseName = 'merged.pdf'
    }
    if (!groups.length || groups.every((group) => group.length === 0)) {
      addToast('error', 'Nothing to export.')
      return
    }

    dispatch({ type: 'RESET_EXPORT' })
    setExportDialogOpen(false)
    dispatch({ type: 'SET_EXPORT_STATE', exportState: { status: 'running', progress: 0 } })
    try {
      for (let index = 0; index < groups.length; index += 1) {
        const group = groups[index]
        const fileName = groups.length === 1 ? baseName : `${baseName.replace(/\.pdf$/i, '')}-part-${index + 1}.pdf`
        const blob = await runAssembly(group, fileName, index, groups.length)
        if (groups.length === 1) {
          const url = URL.createObjectURL(blob)
          dispatch({
            type: 'SET_EXPORT_STATE',
            exportState: {
              status: 'done',
              progress: 1,
              blobUrl: url,
              blobSize: blob.size,
              fileName,
            },
          })
          setExportDialogOpen(true)
        } else {
          triggerDownload(blob, fileName)
          const progress = (index + 1) / groups.length
          dispatch({ type: 'SET_EXPORT_STATE', exportState: { status: 'running', progress } })
        }
      }
      if (groups.length > 1) {
        dispatch({ type: 'SET_EXPORT_STATE', exportState: { status: 'done', progress: 1 } })
        addToast('info', `Exported ${groups.length} files.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      dispatch({ type: 'SET_EXPORT_STATE', exportState: { status: 'error', progress: 0, errorMessage: message } })
      addToast('error', message)
    }
  }, [addToast, dispatch, runAssembly])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        actions.selectAll()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          actions.redo()
        } else {
          actions.undo()
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void handleExport()
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        actions.deleteSelection()
      }
      if (event.key.toLowerCase() === 'r') {
        actions.rotateSelection(90)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [actions, handleExport])

  const selectedPage = useMemo(() => {
    if (timeline.selection.length > 0) {
      return timeline.pages.find((page) => page.id === timeline.selection[timeline.selection.length - 1]) ?? null
    }
    return timeline.pages.length > 0 ? timeline.pages[0] : null
  }, [timeline.pages, timeline.selection])

  const estimatedSize = useMemo(() => formatEstimatedSize(timeline.pages), [timeline.pages])
  const files = useMemo(() => Object.values(state.files), [state.files])

  const canUndo = state.history.past.length > 0
  const canRedo = state.history.future.length > 0

  return (
    <div className="app-shell">
      <Toolbar
        mode={state.mode}
        onModeChange={actions.setMode}
        onImport={() => browseHandler()}
        onUndo={actions.undo}
        onRedo={actions.redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onSelectAll={actions.selectAll}
        onClearSelection={actions.clearSelection}
        onRotate={() => actions.rotateSelection(90)}
        onDelete={actions.deleteSelection}
        onDuplicate={actions.duplicateSelection}
        onExport={() => void handleExport()}
        selectionCount={timeline.selection.length}
        totalPages={timeline.pages.length}
        isExporting={state.exportState.status === 'running'}
        extractSplit={state.extractOptions.splitIntoGroups}
        onToggleSplit={actions.toggleSplitExtract}
      />
      <div className="main-content">
        <section className="page-tray">
          <DropZone onFiles={handleFiles} registerBrowse={setBrowseHandler} />
          <FileList files={files} onRemove={handleRemoveFile} />
          <PageGrid
            pages={timeline.pages}
            files={state.files}
            selection={timeline.selection}
            onTileSelect={actions.handleTileSelect}
            onReorder={actions.reorderPages}
            onRotate={actions.rotatePages}
            onDuplicate={actions.duplicatePages}
            onDelete={actions.deletePages}
            onRequestThumbnail={handleRequestThumbnail}
            onFocus={actions.focusPage}
            setSelection={actions.setExplicitSelection}
          />
        </section>
        <PreviewPane
          page={selectedPage}
          onRotate={() => {
            if (selectedPage) actions.rotatePages([selectedPage.id], 90)
          }}
          onNavigate={(direction) => actions.focusNext(direction)}
          onRequestPreview={handleRequestPreview}
        />
      </div>
      <StatusBar
        totalPages={timeline.pages.length}
        selectedPages={timeline.selection.length}
        estimatedSize={estimatedSize}
        exportState={state.exportState}
      />
      <PasswordPrompt
        open={passwordPrompt !== null}
        fileName={passwordPrompt ? state.files[passwordPrompt.sourceId]?.name ?? 'PDF' : ''}
        message={passwordPrompt?.reason === 'incorrect' ? 'Incorrect password for' : 'Password required for'}
        onSubmit={handlePasswordSubmit}
      />
      <ExportDialog
        open={exportDialogOpen && state.exportState.status === 'done' && Boolean(state.exportState.blobUrl)}
        fileName={state.exportState.fileName ?? 'document.pdf'}
        blobUrl={state.exportState.blobUrl}
        onDownload={() => {
          if (state.exportState.blobUrl) {
            const anchor = document.createElement('a')
            anchor.href = state.exportState.blobUrl
            anchor.download = state.exportState.fileName ?? 'document.pdf'
            anchor.rel = 'noopener'
            anchor.click()
          }
        }}
        onOpenNewTab={() => {
          if (state.exportState.blobUrl) {
            window.open(state.exportState.blobUrl, '_blank', 'noopener')
          }
        }}
        onClose={() => setExportDialogOpen(false)}
      />
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </div>
  )
}

export default function App() {
  return (
    <StudioProvider>
      <StudioApp />
    </StudioProvider>
  )
}
