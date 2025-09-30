import { useCallback } from 'react'
import { useStudioDispatch, useStudioState, useTimeline } from './StudioProvider'
import type { PageItem } from './types'

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids))
}

function directionSelection(pages: PageItem[], start: number | null, end: number): string[] {
  if (pages.length === 0) return []
  const safeStart = start ?? end
  const [min, max] = [Math.min(safeStart, end), Math.max(safeStart, end)]
  return pages.slice(min, max + 1).map((page) => page.id)
}

export function useStudioActions() {
  const dispatch = useStudioDispatch()
  const timeline = useTimeline()
  const state = useStudioState()

  const selectAll = useCallback(() => {
    dispatch({ type: 'SET_SELECTION', pageIds: timeline.pages.map((page) => page.id), lastIndex: timeline.pages.length - 1 })
  }, [dispatch, timeline.pages])

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SET_SELECTION', pageIds: [], lastIndex: null })
  }, [dispatch])

  const focusPage = useCallback(
    (pageId: string | null) => {
      dispatch({ type: 'FOCUS_PAGE', pageId })
    },
    [dispatch],
  )

  const handleTileSelect = useCallback(
    (page: PageItem, index: number, modifiers: { shift: boolean; multi: boolean }) => {
      if (timeline.pages.length === 0) return
      if (modifiers.shift && timeline.lastSelectedIndex !== null) {
        const rangeIds = directionSelection(timeline.pages, timeline.lastSelectedIndex, index)
        dispatch({ type: 'SET_SELECTION', pageIds: rangeIds, lastIndex: index })
        return
      }
      if (modifiers.multi) {
        const alreadySelected = timeline.selection.includes(page.id)
        const nextSelection = alreadySelected
          ? timeline.selection.filter((id) => id !== page.id)
          : [...timeline.selection, page.id]
        dispatch({ type: 'SET_SELECTION', pageIds: uniqueIds(nextSelection), lastIndex: index })
        return
      }
      dispatch({ type: 'SET_SELECTION', pageIds: [page.id], lastIndex: index })
    },
    [dispatch, timeline.lastSelectedIndex, timeline.pages, timeline.selection],
  )

  const setExplicitSelection = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) {
        dispatch({ type: 'SET_SELECTION', pageIds: [], lastIndex: null })
        return
      }
      const lastId = ids[ids.length - 1]
      const index = timeline.pages.findIndex((page) => page.id === lastId)
      dispatch({ type: 'SET_SELECTION', pageIds: uniqueIds(ids), lastIndex: index >= 0 ? index : null })
    },
    [dispatch, timeline.pages],
  )

  const reorderPages = useCallback(
    (ids: string[], targetIndex: number) => {
      dispatch({ type: 'REORDER_PAGES', ids, targetIndex })
    },
    [dispatch],
  )

  const rotatePages = useCallback(
    (ids: string[], delta: number) => {
      if (ids.length === 0) return
      dispatch({ type: 'ROTATE_PAGES', pageIds: ids, delta })
    },
    [dispatch],
  )

  const deletePages = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      dispatch({ type: 'DELETE_PAGES', pageIds: ids })
    },
    [dispatch],
  )

  const duplicatePages = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      dispatch({ type: 'DUPLICATE_PAGES', pageIds: ids })
    },
    [dispatch],
  )

  const setMode = useCallback(
    (mode: 'merge' | 'extract') => {
      dispatch({ type: 'SET_MODE', mode })
      if (mode === 'extract' && timeline.selection.length === 0 && timeline.pages.length > 0) {
        dispatch({ type: 'SET_SELECTION', pageIds: [timeline.pages[0].id], lastIndex: 0 })
      }
    },
    [dispatch, timeline.pages, timeline.selection.length],
  )

  const focusNext = useCallback(
    (direction: 1 | -1) => {
      if (timeline.pages.length === 0) return
      const currentId = timeline.focusedPageId ?? timeline.selection[timeline.selection.length - 1]
      const currentIndex = currentId ? timeline.pages.findIndex((page) => page.id === currentId) : 0
      const nextIndex = Math.min(Math.max((currentIndex ?? 0) + direction, 0), timeline.pages.length - 1)
      const nextPage = timeline.pages[nextIndex]
      if (nextPage) {
        dispatch({ type: 'SET_SELECTION', pageIds: [nextPage.id], lastIndex: nextIndex })
        dispatch({ type: 'FOCUS_PAGE', pageId: nextPage.id })
      }
    },
    [dispatch, timeline.focusedPageId, timeline.pages, timeline.selection],
  )

  const toggleSplitExtract = useCallback(
    (value: boolean) => {
      dispatch({ type: 'SET_EXTRACT_OPTION', key: 'splitIntoGroups', value })
    },
    [dispatch],
  )

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])
  const redo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch])

  const selectionOrAll = useCallback((): string[] => {
    if (timeline.selection.length > 0) return [...timeline.selection]
    return timeline.pages.map((page) => page.id)
  }, [timeline.pages, timeline.selection])

  const rotateSelection = useCallback(
    (delta: number) => {
      rotatePages(selectionOrAll(), delta)
    },
    [rotatePages, selectionOrAll],
  )

  const deleteSelection = useCallback(() => {
    deletePages(selectionOrAll())
  }, [deletePages, selectionOrAll])

  const duplicateSelection = useCallback(() => {
    duplicatePages(selectionOrAll())
  }, [duplicatePages, selectionOrAll])

  return {
    state,
    timeline,
    selectAll,
    clearSelection,
    handleTileSelect,
    reorderPages,
    rotatePages,
    rotateSelection,
    deletePages,
    deleteSelection,
    duplicatePages,
    duplicateSelection,
    focusPage,
    focusNext,
    setMode,
    toggleSplitExtract,
    setExplicitSelection,
    undo,
    redo,
  }
}
