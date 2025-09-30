import { GlobalWorkerOptions, PasswordResponses, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/types/src/display/api'
import type { ReaderWorkerRequest, ReaderWorkerResponse } from './types/messages'
import { readFromReference } from '../utils/fileStore'

const pdfWorker = new Worker(new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url), {
  type: 'module',
})
GlobalWorkerOptions.workerPort = pdfWorker

const workerScope = self as unknown as {
  postMessage: (message: ReaderWorkerResponse, options?: { transfer?: Transferable[] }) => void
}

function postToMain(message: ReaderWorkerResponse, transfer?: Transferable[]) {
  if (transfer && transfer.length > 0) {
    workerScope.postMessage(message, { transfer })
  } else {
    workerScope.postMessage(message)
  }
}

const openDocuments = new Map<string, PDFDocumentProxy>()
const passwordResolvers = new Map<string, (password: string) => void>()

const THUMBNAIL_TARGET = 360
const PREVIEW_TARGET = 1600
const THUMBNAIL_TYPE = 'image/webp'

self.addEventListener('message', (event: MessageEvent<ReaderWorkerRequest>) => {
  const message = event.data
  switch (message.type) {
    case 'load-pdf':
      void handleLoad(message)
      break
    case 'provide-password':
      handleProvidePassword(message)
      break
    case 'render-thumbnail':
      void handleRender(message.sourceId, message.pageIndex, message.requestId, message.maxPixels ?? THUMBNAIL_TARGET)
      break
    case 'render-preview':
      void handleRender(message.sourceId, message.pageIndex, message.requestId, message.maxSize ?? PREVIEW_TARGET, true)
      break
    default:
      break
  }
})

async function handleLoad(message: Extract<ReaderWorkerRequest, { type: 'load-pdf' }>) {
  try {
    const buffer = await readFromReference(message.file)
    const uint8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    const loadingTask = getDocument({
      data: uint8,
      password: message.password,
      disableAutoFetch: true,
    })

    loadingTask.onPassword = (verify: (password: string) => void, reason: number) => {
      passwordResolvers.set(message.requestId, verify)
      const response: ReaderWorkerResponse = {
        type: 'password-required',
        sourceId: message.sourceId,
        requestId: message.requestId,
        reason: reason === PasswordResponses.NEED_PASSWORD ? 'need' : 'incorrect',
      }
        postToMain(response)
    }

    const pdf = await loadingTask.promise
    openDocuments.set(message.sourceId, pdf)

    const meta = await pdf.getMetadata().catch(() => null)
    const info = (meta?.info ?? {}) as Record<string, any>
    const infoResponse: ReaderWorkerResponse = {
      type: 'file-info',
      sourceId: message.sourceId,
      requestId: message.requestId,
      pageCount: pdf.numPages,
      metadata: {
        title: info.Title ?? null,
        author: info.Author ?? null,
        subject: info.Subject ?? null,
        keywords: info.Keywords ?? null,
      },
    }
    postToMain(infoResponse)

    const eagerCount = message.eagerThumbnailCount ?? Math.min(8, pdf.numPages)

    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index)
      const viewport = page.getViewport({ scale: 1 })
      const rotation = page.rotate
      let thumbnailBuffer: ArrayBuffer | undefined
      if (index <= eagerCount) {
        thumbnailBuffer = await renderPageImage(page, THUMBNAIL_TARGET, THUMBNAIL_TYPE)
      }
      const response: ReaderWorkerResponse = {
        type: 'page-ready',
        sourceId: message.sourceId,
        requestId: message.requestId,
        pageIndex: index,
        width: viewport.width,
        height: viewport.height,
        rotation,
        thumbnailBuffer,
        thumbnailType: THUMBNAIL_TYPE,
      }
      if (thumbnailBuffer) {
        postToMain(response, [thumbnailBuffer])
      } else {
        postToMain(response)
      }
      page.cleanup()
    }
  } catch (error) {
    const response: ReaderWorkerResponse = {
      type: 'file-error',
      sourceId: message.sourceId,
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Failed to load PDF',
    }
    postToMain(response)
  }
}

function handleProvidePassword(message: Extract<ReaderWorkerRequest, { type: 'provide-password' }>) {
  const resolver = passwordResolvers.get(message.requestId)
  if (resolver) {
    passwordResolvers.delete(message.requestId)
    resolver(message.password)
  }
}

async function handleRender(
  sourceId: string,
  pageIndex: number,
  requestId: string,
  target: number,
  highResolution = false,
) {
  try {
    const pdf = openDocuments.get(sourceId)
    if (!pdf) {
      const response: ReaderWorkerResponse = {
        type: 'file-error',
        sourceId,
        requestId,
        message: 'Document not available in worker cache',
      }
      postMessage(response)
      return
    }
    const page = await pdf.getPage(pageIndex)
    const mimeType = highResolution ? 'image/png' : THUMBNAIL_TYPE
    const buffer = await renderPageImage(page, target, mimeType)
    const response: ReaderWorkerResponse = highResolution
      ? {
          type: 'preview-ready',
          sourceId,
          pageIndex,
          requestId,
          buffer,
          mimeType,
        }
      : {
          type: 'thumbnail-ready',
          sourceId,
          pageIndex,
          requestId,
          buffer,
          mimeType,
        }
    postToMain(response, [buffer])
    page.cleanup()
  } catch (error) {
    const response: ReaderWorkerResponse = {
      type: 'file-error',
      sourceId,
      requestId,
      message: error instanceof Error ? error.message : 'Failed to render page',
    }
    postToMain(response)
  }
}

async function renderPageImage(page: PDFPageProxy, target: number, mimeType: string): Promise<ArrayBuffer> {
  const viewport = page.getViewport({ scale: 1 })
  const maxDimension = Math.max(viewport.width, viewport.height)
  const scale = Math.min(target / maxDimension, 2)
  const renderViewport = page.getViewport({ scale })
  const canvas = new OffscreenCanvas(Math.ceil(renderViewport.width), Math.ceil(renderViewport.height))
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) {
    throw new Error('Unable to obtain rendering context for thumbnail generation')
  }
  const renderTask = page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    canvas: null,
    viewport: renderViewport,
  })
  await renderTask.promise
  const blob = await canvas.convertToBlob({ type: mimeType, quality: mimeType === 'image/png' ? undefined : 0.85 })
  const buffer = await blob.arrayBuffer()
  return buffer
}

export type {}
