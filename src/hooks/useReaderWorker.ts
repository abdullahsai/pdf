import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { StoredFileReference } from '../utils/fileStore'
import type { ReaderWorkerRequest, ReaderWorkerResponse } from '../workers/types/messages'

interface LoadPayload {
  sourceId: string
  requestId: string
  file: StoredFileReference & { size: number; name: string }
  password?: string
  eagerThumbnailCount?: number
}

interface RenderPayload {
  sourceId: string
  pageIndex: number
  requestId: string
  maxPixels?: number
}

export interface ReaderWorkerApi {
  loadPdf(payload: LoadPayload): void
  providePassword(sourceId: string, requestId: string, password: string): void
  renderThumbnail(payload: RenderPayload): void
  renderPreview(payload: RenderPayload): void
}

export function useReaderWorker(onMessage: (message: ReaderWorkerResponse) => void): ReaderWorkerApi {
  const workerRef = useRef<Worker | null>(null)
  useEffect(() => {
    const worker = new Worker(new URL('../workers/reader-worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const handler = (event: MessageEvent<ReaderWorkerResponse>) => {
      onMessage(event.data)
    }
    worker.addEventListener('message', handler)
    return () => {
      worker.removeEventListener('message', handler)
      worker.terminate()
      workerRef.current = null
    }
  }, [onMessage])

  const postMessage = useCallback((message: ReaderWorkerRequest, transferables?: Transferable[]) => {
    if (!workerRef.current) return
    workerRef.current.postMessage(message, transferables ?? [])
  }, [])

  return useMemo(
    () => ({
      loadPdf: (payload: LoadPayload) => {
        postMessage({
          type: 'load-pdf',
          ...payload,
        })
      },
      providePassword: (sourceId: string, requestId: string, password: string) => {
        postMessage({ type: 'provide-password', sourceId, requestId, password })
      },
      renderThumbnail: (payload: RenderPayload) => {
        postMessage({ type: 'render-thumbnail', ...payload })
      },
      renderPreview: (payload: RenderPayload) => {
        const { maxPixels, ...rest } = payload
        postMessage({ type: 'render-preview', ...rest, maxSize: maxPixels })
      },
    }),
    [postMessage],
  )
}
