import type { StoredFileReference } from '../../utils/fileStore'

export type ReaderWorkerRequest =
  | {
      type: 'load-pdf'
      sourceId: string
      requestId: string
      file: StoredFileReference & { size: number; name: string }
      password?: string
      eagerThumbnailCount?: number
    }
  | {
      type: 'provide-password'
      sourceId: string
      requestId: string
      password: string
    }
  | {
      type: 'render-thumbnail'
      sourceId: string
      pageIndex: number
      requestId: string
      maxPixels?: number
    }
  | {
      type: 'render-preview'
      sourceId: string
      pageIndex: number
      requestId: string
      maxSize?: number
    }

export type ReaderWorkerResponse =
  | {
      type: 'file-info'
      sourceId: string
      requestId: string
      pageCount: number
      metadata: {
        title?: string | null
        author?: string | null
        subject?: string | null
        keywords?: string | null
      }
    }
  | {
      type: 'page-ready'
      sourceId: string
      requestId: string
      pageIndex: number
      width: number
      height: number
      rotation: number
      thumbnailBuffer?: ArrayBuffer
      thumbnailType?: string
    }
  | {
      type: 'thumbnail-ready'
      sourceId: string
      pageIndex: number
      requestId: string
      buffer: ArrayBuffer
      mimeType: string
    }
  | {
      type: 'preview-ready'
      sourceId: string
      pageIndex: number
      requestId: string
      buffer: ArrayBuffer
      mimeType: string
    }
  | {
      type: 'password-required'
      sourceId: string
      requestId: string
      reason: 'need' | 'incorrect'
    }
  | {
      type: 'file-error'
      sourceId: string
      requestId: string
      message: string
    }

export type AssemblyWorkerRequest =
  | {
      type: 'assemble'
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

export type AssemblyWorkerResponse =
  | {
      type: 'progress'
      jobId: string
      value: number
    }
  | {
      type: 'result'
      jobId: string
      buffer: ArrayBuffer
    }
  | {
      type: 'error'
      jobId: string
      message: string
    }
