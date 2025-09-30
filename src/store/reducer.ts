import { createId } from '../utils/id'
import type { PageItem, StudioAction, StudioState, TimelineSnapshot } from './types'
import { initialStudioState } from './types'

function clonePage(page: PageItem): PageItem {
  return { ...page }
}

function cloneSnapshot(snapshot: TimelineSnapshot): TimelineSnapshot {
  return {
    pages: snapshot.pages.map(clonePage),
    selection: [...snapshot.selection],
    focusedPageId: snapshot.focusedPageId,
    lastSelectedIndex: snapshot.lastSelectedIndex,
  }
}

function produceSnapshot(
  snapshot: TimelineSnapshot,
  mutator: (draft: TimelineSnapshot) => void,
): TimelineSnapshot {
  const draft = cloneSnapshot(snapshot)
  mutator(draft)
  return draft
}

function withHistory(
  state: StudioState,
  mutator: (draft: TimelineSnapshot) => void,
): StudioState {
  const next = produceSnapshot(state.history.present, mutator)
  return {
    ...state,
    history: {
      past: [...state.history.past, cloneSnapshot(state.history.present)],
      present: next,
      future: [],
    },
  }
}

function updatePresent(
  state: StudioState,
  mutator: (draft: TimelineSnapshot) => void,
): StudioState {
  const next = produceSnapshot(state.history.present, mutator)
  return {
    ...state,
    history: {
      ...state.history,
      present: next,
    },
  }
}

function sanitizeSelection(pages: PageItem[], selection: string[]): string[] {
  const idSet = new Set(pages.map((p) => p.id))
  return selection.filter((id) => idSet.has(id))
}

function ensureFocus(snapshot: TimelineSnapshot): void {
  if (!snapshot.focusedPageId && snapshot.pages.length > 0) {
    snapshot.focusedPageId = snapshot.pages[0].id
    snapshot.lastSelectedIndex = 0
  } else if (snapshot.focusedPageId && !snapshot.pages.some((p) => p.id === snapshot.focusedPageId)) {
    snapshot.focusedPageId = snapshot.pages.length > 0 ? snapshot.pages[Math.min(snapshot.pages.length - 1, snapshot.lastSelectedIndex ?? 0)].id : null
  }
}

export function studioReducer(state: StudioState = initialStudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.mode,
      }
    case 'REGISTER_FILE':
      return {
        ...state,
        files: {
          ...state.files,
          [action.file.id]: action.file,
        },
      }
    case 'UPDATE_FILE_STATUS': {
      const file = state.files[action.sourceId]
      if (!file) return state
      return {
        ...state,
        files: {
          ...state.files,
          [action.sourceId]: {
            ...file,
            status: action.status,
            error: action.error,
          },
        },
      }
    }
    case 'SET_FILE_METADATA': {
      const file = state.files[action.sourceId]
      if (!file) return state
      return {
        ...state,
        files: {
          ...state.files,
          [action.sourceId]: {
            ...file,
            metadata: action.metadata,
          },
        },
      }
    }
    case 'SET_FILE_PAGE_COUNT': {
      const file = state.files[action.sourceId]
      if (!file) return state
      return {
        ...state,
        files: {
          ...state.files,
          [action.sourceId]: {
            ...file,
            pageCount: action.pageCount,
          },
        },
      }
    }
    case 'MAP_PAGE_ID': {
      const file = state.files[action.sourceId]
      if (!file) return state
      const pageIds = [...file.pageIds]
      pageIds[action.pageIndex - 1] = action.pageId
      return {
        ...state,
        files: {
          ...state.files,
          [action.sourceId]: {
            ...file,
            pageIds,
          },
        },
      }
    }
    case 'REMOVE_FILE': {
      if (!state.files[action.sourceId]) return state
      const files = { ...state.files }
      delete files[action.sourceId]
      const nextState = { ...state, files }
      return withHistory(nextState, (draft) => {
        draft.pages = draft.pages.filter((page) => page.sourceId !== action.sourceId)
        draft.selection = sanitizeSelection(draft.pages, draft.selection)
        ensureFocus(draft)
      })
    }
    case 'PUSH_PAGES': {
      if (action.pages.length === 0) return state
      return withHistory(state, (draft) => {
        draft.pages = [...draft.pages, ...action.pages.map(clonePage)]
        draft.selection = sanitizeSelection(draft.pages, draft.selection)
        ensureFocus(draft)
      })
    }
    case 'REORDER_PAGES': {
      if (action.ids.length === 0) return state
      return withHistory(state, (draft) => {
        const idSet = new Set(action.ids)
        const moving = draft.pages.filter((page) => idSet.has(page.id))
        if (moving.length === 0) return
        const remaining = draft.pages.filter((page) => !idSet.has(page.id))
        const target = Math.max(0, Math.min(action.targetIndex, remaining.length))
        const before = remaining.slice(0, target)
        const after = remaining.slice(target)
        draft.pages = [...before, ...moving, ...after]
        draft.selection = sanitizeSelection(draft.pages, draft.selection)
        const lastSelectedId = draft.selection[draft.selection.length - 1]
        if (lastSelectedId) {
          const newIndex = draft.pages.findIndex((page) => page.id === lastSelectedId)
          draft.lastSelectedIndex = newIndex >= 0 ? newIndex : draft.lastSelectedIndex
        }
        ensureFocus(draft)
      })
    }
    case 'ROTATE_PAGES': {
      if (action.pageIds.length === 0) return state
      return withHistory(state, (draft) => {
        const set = new Set(action.pageIds)
        draft.pages = draft.pages.map((page) =>
          set.has(page.id)
            ? {
                ...page,
                rotation: (page.rotation + action.delta + 360) % 360,
              }
            : page,
        )
      })
    }
    case 'DELETE_PAGES': {
      if (action.pageIds.length === 0) return state
      return withHistory(state, (draft) => {
        const set = new Set(action.pageIds)
        draft.pages = draft.pages.filter((page) => !set.has(page.id))
        draft.selection = draft.selection.filter((id) => !set.has(id))
        if (draft.selection.length === 0 && draft.pages.length > 0) {
          draft.selection = [draft.pages[Math.min(draft.lastSelectedIndex ?? 0, draft.pages.length - 1)].id]
        }
        ensureFocus(draft)
      })
    }
    case 'DUPLICATE_PAGES': {
      if (action.pageIds.length === 0) return state
      return withHistory(state, (draft) => {
        const idSet = new Set(action.pageIds)
        const indices = draft.pages.reduce<number[]>((acc, page, index) => {
          if (idSet.has(page.id)) acc.push(index)
          return acc
        }, [])
        if (indices.length === 0) return
        const insertionIndex = (() => {
          if (action.insertAfterId) {
            const idx = draft.pages.findIndex((p) => p.id === action.insertAfterId)
            return idx >= 0 ? idx + 1 : indices[indices.length - 1] + 1
          }
          return indices[indices.length - 1] + 1
        })()
        const duplicates = indices.map((idx) => {
          const original = draft.pages[idx]
          return {
            ...clonePage(original),
            id: createId('page'),
          }
        })
        draft.pages = [
          ...draft.pages.slice(0, insertionIndex),
          ...duplicates,
          ...draft.pages.slice(insertionIndex),
        ]
        draft.selection = duplicates.map((page) => page.id)
        draft.lastSelectedIndex = insertionIndex + duplicates.length - 1
        draft.focusedPageId = draft.selection[draft.selection.length - 1] ?? draft.focusedPageId
      })
    }
    case 'SET_THUMBNAIL':
      return updatePresent(state, (draft) => {
        draft.pages = draft.pages.map((page) =>
          page.id === action.pageId
            ? {
                ...page,
                thumbnailUrl: action.thumbnailUrl,
              }
            : page,
        )
      })
    case 'SET_PREVIEW':
      return updatePresent(state, (draft) => {
        draft.pages = draft.pages.map((page) =>
          page.id === action.pageId
            ? {
                ...page,
                previewUrl: action.previewUrl,
              }
            : page,
        )
      })
    case 'SET_SELECTION':
      return updatePresent(state, (draft) => {
        draft.selection = sanitizeSelection(draft.pages, action.pageIds)
        draft.lastSelectedIndex = action.lastIndex ?? draft.lastSelectedIndex
        const lastId = draft.selection[draft.selection.length - 1]
        if (lastId) {
          draft.focusedPageId = lastId
          draft.lastSelectedIndex = draft.pages.findIndex((page) => page.id === lastId)
        }
      })
    case 'FOCUS_PAGE':
      return updatePresent(state, (draft) => {
        draft.focusedPageId = action.pageId
        if (action.pageId) {
          const idx = draft.pages.findIndex((page) => page.id === action.pageId)
          draft.lastSelectedIndex = idx >= 0 ? idx : draft.lastSelectedIndex
        }
      })
    case 'UNDO': {
      if (state.history.past.length === 0) return state
      const previous = state.history.past[state.history.past.length - 1]
      return {
        ...state,
        history: {
          past: state.history.past.slice(0, -1),
          present: cloneSnapshot(previous),
          future: [cloneSnapshot(state.history.present), ...state.history.future],
        },
      }
    }
    case 'REDO': {
      if (state.history.future.length === 0) return state
      const [next, ...rest] = state.history.future
      return {
        ...state,
        history: {
          past: [...state.history.past, cloneSnapshot(state.history.present)],
          present: cloneSnapshot(next),
          future: rest.map(cloneSnapshot),
        },
      }
    }
    case 'SET_EXPORT_STATE':
      return {
        ...state,
        exportState: {
          ...state.exportState,
          ...action.exportState,
        },
      }
    case 'RESET_EXPORT':
      return {
        ...state,
        exportState: {
          status: 'idle',
          progress: 0,
        },
      }
    case 'SET_EXTRACT_OPTION':
      return {
        ...state,
        extractOptions: {
          ...state.extractOptions,
          [action.key]: action.value,
        },
      }
    default:
      return state
  }
}
