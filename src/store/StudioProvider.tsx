import { createContext, useContext, useMemo, useReducer } from 'react'
import { studioReducer } from './reducer'
import type { StudioAction, StudioState, TimelineSnapshot } from './types'
import { initialStudioState } from './types'

const StudioStateContext = createContext<StudioState | undefined>(undefined)
const StudioDispatchContext = createContext<React.Dispatch<StudioAction> | undefined>(undefined)

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(studioReducer, initialStudioState)
  const memoState = useMemo(() => state, [state])
  return (
    <StudioStateContext.Provider value={memoState}>
      <StudioDispatchContext.Provider value={dispatch}>{children}</StudioDispatchContext.Provider>
    </StudioStateContext.Provider>
  )
}

export function useStudioState(): StudioState {
  const context = useContext(StudioStateContext)
  if (!context) {
    throw new Error('useStudioState must be used within a StudioProvider')
  }
  return context
}

export function useStudioDispatch(): React.Dispatch<StudioAction> {
  const context = useContext(StudioDispatchContext)
  if (!context) {
    throw new Error('useStudioDispatch must be used within a StudioProvider')
  }
  return context
}

export function useTimeline(): TimelineSnapshot {
  const state = useStudioState()
  return state.history.present
}
