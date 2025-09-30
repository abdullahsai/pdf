import { useEffect, useMemo, useRef, useState } from 'react'
import Sortable from 'sortablejs'
import type { PageItem, SourceFileState } from '../store/types'
import { PageTile } from './PageTile'

interface PageGridProps {
  pages: PageItem[]
  files: Record<string, SourceFileState>
  selection: string[]
  onTileSelect: (page: PageItem, index: number, modifiers: { shift: boolean; multi: boolean }) => void
  onReorder: (ids: string[], targetIndex: number) => void
  onRotate: (ids: string[], delta: number) => void
  onDuplicate: (ids: string[]) => void
  onDelete: (ids: string[]) => void
  onRequestThumbnail: (page: PageItem) => void
  onFocus: (pageId: string) => void
  setSelection: (ids: string[]) => void
}

type Rect = { left: number; top: number; right: number; bottom: number }

function intersects(a: Rect, b: Rect): boolean {
  return !(a.left > b.right || a.right < b.left || a.top > b.bottom || a.bottom < b.top)
}

export function PageGrid({
  pages,
  files,
  selection,
  onTileSelect,
  onReorder,
  onRotate,
  onDuplicate,
  onDelete,
  onRequestThumbnail,
  onFocus,
  setSelection,
}: PageGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pageRefs = useRef(new Map<string, HTMLDivElement>())
  const [lassoRect, setLassoRect] = useState<Rect | null>(null)
  const [activePointerId, setActivePointerId] = useState<number | null>(null)
  const lassoStart = useRef<{ x: number; y: number } | null>(null)
  const requestedThumbs = useRef(new Set<string>())

  useEffect(() => {
    if (!containerRef.current) return
    const sortable = new Sortable(containerRef.current, {
      animation: 150,
      draggable: '.page-tile',
      filter: '.tile-action',
      ghostClass: 'page-tile--ghost',
      onEnd: (event) => {
        const element = event.item as HTMLElement
        const pageId = element.dataset.pageId
        if (!pageId) return
        const isMultiDrag = selection.includes(pageId)
        const ids = isMultiDrag ? selection : [pageId]
        const targetIndex = event.newIndex ?? 0
        onReorder(ids, targetIndex)
      },
    })
    return () => {
      sortable.destroy()
    }
  }, [onReorder, selection])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const element = entry.target as HTMLElement
          const pageId = element.dataset.pageId
          if (!pageId) continue
          if (requestedThumbs.current.has(pageId)) continue
          const page = pages.find((p) => p.id === pageId)
          if (page && !page.thumbnailUrl) {
            requestedThumbs.current.add(pageId)
            onRequestThumbnail(page)
          }
        }
      },
      { root: containerRef.current, rootMargin: '200px', threshold: 0.1 },
    )
    const currentRefs = pageRefs.current
    for (const [, element] of currentRefs) {
      observer.observe(element)
    }
    return () => {
      observer.disconnect()
    }
  }, [onRequestThumbnail, pages])

  useEffect(() => {
    const currentRefs = pageRefs.current
    for (const [id, element] of currentRefs) {
      const hasPage = pages.some((page) => page.id === id)
      if (!hasPage) {
        currentRefs.delete(id)
      } else {
        element.dataset.selected = selection.includes(id) ? 'true' : 'false'
      }
    }
  }, [pages, selection])

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('.page-tile')) return
    if (!containerRef.current) return
    lassoStart.current = { x: event.clientX, y: event.clientY }
    setLassoRect({ left: event.clientX, top: event.clientY, right: event.clientX, bottom: event.clientY })
    containerRef.current.setPointerCapture(event.pointerId)
    setActivePointerId(event.pointerId)
  }

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (activePointerId !== event.pointerId) return
    if (!lassoStart.current) return
    const nextRect: Rect = {
      left: Math.min(lassoStart.current.x, event.clientX),
      top: Math.min(lassoStart.current.y, event.clientY),
      right: Math.max(lassoStart.current.x, event.clientX),
      bottom: Math.max(lassoStart.current.y, event.clientY),
    }
    setLassoRect(nextRect)
  }

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (activePointerId !== event.pointerId) return
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(event.pointerId)
    }
    setActivePointerId(null)
    const currentRect = lassoRect
    setLassoRect(null)
    lassoStart.current = null
    if (!currentRect) return
    const intersecting: string[] = []
    for (const [id, element] of pageRefs.current) {
      const rect = element.getBoundingClientRect()
      const elementRect: Rect = {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      }
      if (intersects(elementRect, currentRect)) {
        intersecting.push(id)
      }
    }
    if (intersecting.length > 0) {
      setSelection(intersecting)
      onFocus(intersecting[intersecting.length - 1])
    }
  }

  useEffect(() => {
    const ids = new Set(pages.map((page) => page.id))
    for (const id of requestedThumbs.current) {
      if (!ids.has(id)) {
        requestedThumbs.current.delete(id)
      }
    }
  }, [pages])

  const lassoStyle = useMemo(() => {
    if (!lassoRect) return undefined
    const width = Math.abs(lassoRect.right - lassoRect.left)
    const height = Math.abs(lassoRect.bottom - lassoRect.top)
    return {
      left: `${Math.min(lassoRect.left, lassoRect.right)}px`,
      top: `${Math.min(lassoRect.top, lassoRect.bottom)}px`,
      width: `${width}px`,
      height: `${height}px`,
    }
  }, [lassoRect])

  return (
    <div
      className="page-grid"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {pages.map((page, index) => (
        <PageTile
          key={page.id}
          ref={(element) => {
            if (element) {
              pageRefs.current.set(page.id, element)
            } else {
              pageRefs.current.delete(page.id)
            }
          }}
          page={page}
          isSelected={selection.includes(page.id)}
          sourceLabel={files[page.sourceId]?.name ?? 'Document'}
          onSelect={(modifiers) => onTileSelect(page, index, modifiers)}
          onRotate={() => onRotate(selection.includes(page.id) ? selection : [page.id], 90)}
          onDelete={() => onDelete(selection.includes(page.id) ? selection : [page.id])}
          onDuplicate={() => onDuplicate(selection.includes(page.id) ? selection : [page.id])}
          onFocus={() => onFocus(page.id)}
        />
      ))}
      {lassoRect && <div className="lasso" style={lassoStyle} />}
    </div>
  )
}
