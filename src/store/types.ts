import type { StoredFileReference } from '../utils/fileStore'

export type StudioMode = 'merge' | 'extract'

export type FileLoadStatus = 'loading' | 'ready' | 'error' | 'password-required'

export interface SourceFileState {
  id: string
  name: string
  size: number
  status: FileLoadStatus
  pageCount: number
  storage: StoredFileReference
  error?: string
  passwordPrompted?: boolean
  metadata?: {
    title?: string | null
    author?: string | null
    subject?: string | null
    keywords?: string | null
  }
  useOPFS: boolean
  pageIds: string[]
}

export interface PageItem {
  id: string
  sourceId: string
  sourceName: string
  originalIndex: number
  rotation: number
  width: number
  height: number
  orientation: 'portrait' | 'landscape' | 'square'
  thumbnailUrl?: string
  previewUrl?: string
  textSnippet?: string
}

export interface TimelineSnapshot {
  pages: PageItem[]
  selection: string[]
  focusedPageId: string | null
  lastSelectedIndex: number | null
}

export interface ExportState {
  status: 'idle' | 'running' | 'done' | 'error'
  progress: number
  errorMessage?: string
  blobUrl?: string
  blobSize?: number
  fileName?: string
}

export interface StudioState {
  mode: StudioMode
  files: Record<string, SourceFileState>
  history: {
    past: TimelineSnapshot[]
    present: TimelineSnapshot
    future: TimelineSnapshot[]
  }
  exportState: ExportState
  extractOptions: {
    splitIntoGroups: boolean
  }
}

export type StudioAction =
  | { type: 'SET_MODE'; mode: StudioMode }
  | { type: 'REGISTER_FILE'; file: SourceFileState }
  | { type: 'UPDATE_FILE_STATUS'; sourceId: string; status: FileLoadStatus; error?: string }
  | { type: 'SET_FILE_METADATA'; sourceId: string; metadata: SourceFileState['metadata'] }
  | { type: 'SET_FILE_PAGE_COUNT'; sourceId: string; pageCount: number }
  | { type: 'MAP_PAGE_ID'; sourceId: string; pageIndex: number; pageId: string }
  | { type: 'PUSH_PAGES'; pages: PageItem[] }
  | { type: 'REORDER_PAGES'; ids: string[]; targetIndex: number }
  | { type: 'ROTATE_PAGES'; pageIds: string[]; delta: number }
  | { type: 'DELETE_PAGES'; pageIds: string[] }
  | { type: 'DUPLICATE_PAGES'; pageIds: string[]; insertAfterId?: string }
  | { type: 'SET_THUMBNAIL'; pageId: string; thumbnailUrl: string }
  | { type: 'SET_PREVIEW'; pageId: string; previewUrl: string }
  | { type: 'SET_SELECTION'; pageIds: string[]; lastIndex?: number | null }
  | { type: 'FOCUS_PAGE'; pageId: string | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_EXPORT_STATE'; exportState: Partial<ExportState> & { status: ExportState['status'] } }
  | { type: 'RESET_EXPORT' }
  | { type: 'SET_EXTRACT_OPTION'; key: keyof StudioState['extractOptions']; value: boolean }
  | { type: 'REMOVE_FILE'; sourceId: string }

export function createEmptySnapshot(): TimelineSnapshot {
  return {
    pages: [],
    selection: [],
    focusedPageId: null,
    lastSelectedIndex: null,
  }
}

export const initialStudioState: StudioState = {
  mode: 'merge',
  files: {},
  history: {
    past: [],
    present: createEmptySnapshot(),
    future: [],
  },
  exportState: {
    status: 'idle',
    progress: 0,
  },
  extractOptions: {
    splitIntoGroups: false,
  },
}
