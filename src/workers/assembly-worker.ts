import { PDFDocument, degrees } from 'pdf-lib'
import type { AssemblyWorkerRequest, AssemblyWorkerResponse } from './types/messages'
import { readFromReference } from '../utils/fileStore'

const workerScope = self as unknown as {
  postMessage: (message: AssemblyWorkerResponse, options?: { transfer?: Transferable[] }) => void
}

self.addEventListener('message', (event: MessageEvent<AssemblyWorkerRequest>) => {
  const message = event.data
  if (message.type === 'assemble') {
    void handleAssemble(message)
  }
})

async function handleAssemble(message: Extract<AssemblyWorkerRequest, { type: 'assemble' }>) {
  try {
    const doc = await PDFDocument.create()
    const sourceCache = new Map<string, PDFDocument>()
    const total = message.pages.length
    for (let index = 0; index < total; index += 1) {
      const item = message.pages[index]
      const reference = message.sources[item.sourceId]
      if (!reference) {
        const errorResponse: AssemblyWorkerResponse = {
          type: 'error',
          jobId: message.jobId,
          message: `Missing source reference for ${item.sourceId}`,
        }
        workerScope.postMessage(errorResponse)
        return
      }
      let sourceDoc = sourceCache.get(item.sourceId)
      if (!sourceDoc) {
        const buffer = await readFromReference(reference)
        const typed = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
        sourceDoc = await PDFDocument.load(typed, { ignoreEncryption: true })
        sourceCache.set(item.sourceId, sourceDoc)
      }
      const [copiedPage] = await doc.copyPages(sourceDoc, [item.sourcePageIndex - 1])
      if (item.rotation % 360 !== 0) {
        copiedPage.setRotation(degrees(item.rotation % 360))
      }
      doc.addPage(copiedPage)
      const progressResponse: AssemblyWorkerResponse = {
        type: 'progress',
        jobId: message.jobId,
        value: total === 0 ? 1 : (index + 1) / total,
      }
      workerScope.postMessage(progressResponse)
    }

    const pdfBytes = await doc.save({ useObjectStreams: true })
    const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
    const resultResponse: AssemblyWorkerResponse = {
      type: 'result',
      jobId: message.jobId,
      buffer: buffer as ArrayBuffer,
    }
    workerScope.postMessage(resultResponse, { transfer: [buffer] })
  } catch (error) {
    const errorResponse: AssemblyWorkerResponse = {
      type: 'error',
      jobId: message.jobId,
      message: error instanceof Error ? error.message : 'Failed to assemble PDF',
    }
    workerScope.postMessage(errorResponse)
  }
}

export type {}
