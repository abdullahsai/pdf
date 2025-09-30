import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { StoredFileReference } from '../utils/fileStore'
import type { AssemblyWorkerRequest, AssemblyWorkerResponse } from '../workers/types/messages'

interface AssemblePayload {
  jobId: string
  fileName: string
  pages: Array<{
    pageId: string
    sourceId: string
    sourcePageIndex: number
    rotation: number
  }>
  sources: Record<string, StoredFileReference & { size: number; name: string }>
}

export interface AssemblyWorkerApi {
  assemble(payload: AssemblePayload): void
}

export function useAssemblyWorker(onMessage: (message: AssemblyWorkerResponse) => void): AssemblyWorkerApi {
  const workerRef = useRef<Worker | null>(null)
  useEffect(() => {
    const worker = new Worker(new URL('../workers/assembly-worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    const handler = (event: MessageEvent<AssemblyWorkerResponse>) => {
      onMessage(event.data)
    }
    worker.addEventListener('message', handler)
    return () => {
      worker.removeEventListener('message', handler)
      worker.terminate()
      workerRef.current = null
    }
  }, [onMessage])

  const postMessage = useCallback((message: AssemblyWorkerRequest, transferables?: Transferable[]) => {
    if (!workerRef.current) return
    workerRef.current.postMessage(message, transferables ?? [])
  }, [])

  return useMemo(
    () => ({
      assemble: (payload: AssemblePayload) => {
        postMessage({ type: 'assemble', ...payload })
      },
    }),
    [postMessage],
  )
}
