// ============================================================================
// Store hydration tracking
// ----------------------------------------------------------------------------
// Every persisted store reads its slice from IndexedDB asynchronously on boot.
// To avoid UI flashes (e.g. the "create admin" button appearing for a frame
// before the saved accounts load), the app waits until every registered store
// has finished rehydrating before it renders. Each store declares itself with
// `expectHydration(name)` at module load and calls `markHydrated(name)` once
// its rehydration callback fires.
// ============================================================================

import { useSyncExternalStore } from 'react'

const expected = new Set<string>()
const done = new Set<string>()
const listeners = new Set<() => void>()

/** Declared synchronously when a persisted store module is evaluated. */
export const expectHydration = (name: string): void => {
  expected.add(name)
}

/** Called once a store has finished reading its slice from IndexedDB. */
export const markHydrated = (name: string): void => {
  done.add(name)
  listeners.forEach((fn) => fn())
}

const subscribe = (fn: () => void): (() => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

// All `expectHydration` calls run synchronously at import time, before any
// async rehydration completes, so `expected` is fully populated by first render.
const getSnapshot = (): boolean => expected.size > 0 && done.size >= expected.size

/** `true` once every persisted store has loaded its data from IndexedDB. */
export const useHydrated = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, () => false)
