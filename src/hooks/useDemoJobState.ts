import { useCallback, useEffect, useRef, useState } from "react"

export type DemoApplication = {
  jobId: string
  appliedAt: string
  status: "submitted"
}

type PersistedDemoJobState = {
  savedIds: string[]
  applications: DemoApplication[]
  recentlyViewedIds: string[]
  userLocation: { latitude: number; longitude: number; accuracy?: number } | null
}

const emptyState: PersistedDemoJobState = { savedIds: [], applications: [], recentlyViewedIds: [], userLocation: null }
const changeEvent = "shram-bazar:demo-jobs-changed"

function storageKey(workerId: string) {
  return `shram-bazar-demo-jobs-v1:${workerId}`
}

function readState(key: string): PersistedDemoJobState {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null") as Partial<PersistedDemoJobState> | null
    return {
      savedIds: Array.isArray(value?.savedIds) ? value.savedIds.filter((id): id is string => typeof id === "string") : [],
      applications: Array.isArray(value?.applications) ? value.applications.filter((application): application is DemoApplication => !!application && typeof application.jobId === "string" && typeof application.appliedAt === "string") : [],
      recentlyViewedIds: Array.isArray(value?.recentlyViewedIds) ? value.recentlyViewedIds.filter((id): id is string => typeof id === "string").slice(0, 8) : [],
      // Never restore old coordinates as a user's current location. The page
      // reacquires a fresh fix when the browser already grants permission.
      userLocation: null,
    }
  } catch {
    return emptyState
  }
}

export function useDemoJobState(workerId: string | undefined) {
  const key = storageKey(workerId || "guest")
  const [state, setState] = useState<PersistedDemoJobState>(() => readState(key))
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    const initial = { ...readState(key), userLocation: null }
    stateRef.current = initial
    setState(initial)
    const refresh = () => setState(() => {
      const next = { ...readState(key), userLocation: stateRef.current.userLocation }
      stateRef.current = next
      return next
    })
    refresh()
    window.addEventListener("storage", refresh)
    window.addEventListener(changeEvent, refresh)
    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener(changeEvent, refresh)
    }
  }, [key])

  const update = useCallback((change: (current: PersistedDemoJobState) => PersistedDemoJobState) => {
    const next = change({ ...readState(key), userLocation: stateRef.current.userLocation })
    stateRef.current = next
    setState(next)
    try {
      const { userLocation: _currentLocation, ...persisted } = next
      localStorage.setItem(key, JSON.stringify(persisted))
      window.dispatchEvent(new Event(changeEvent))
    } catch {
      // Keep this browser session usable when persistent storage is unavailable.
    }
  }, [key])

  const toggleSaved = useCallback((jobId: string) => update((current) => ({
    ...current,
    savedIds: current.savedIds.includes(jobId) ? current.savedIds.filter((id) => id !== jobId) : [jobId, ...current.savedIds],
  })), [update])

  const apply = useCallback((jobId: string) => update((current) => current.applications.some((item) => item.jobId === jobId)
    ? current
    : { ...current, applications: [{ jobId, appliedAt: new Date().toISOString(), status: "submitted" }, ...current.applications] }), [update])

  const markViewed = useCallback((jobId: string) => update((current) => ({
    ...current,
    recentlyViewedIds: [jobId, ...current.recentlyViewedIds.filter((id) => id !== jobId)].slice(0, 8),
  })), [update])

  const setUserLocation = useCallback((userLocation: PersistedDemoJobState["userLocation"]) => update((current) => ({ ...current, userLocation })), [update])

  return { ...state, toggleSaved, apply, markViewed, setUserLocation }
}
