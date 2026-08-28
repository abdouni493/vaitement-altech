// ============================================================================
// IndexedDB persistence for Zustand stores
// ----------------------------------------------------------------------------
// The boutique's data lives in an on-device IndexedDB database (via idb-keyval)
// instead of constant seed data in memory. Every store is wrapped with the
// zustand `persist` middleware and reads/writes its slice here, so everything
// the user enters — products, purchases, sales, clients, accounts, settings —
// survives page reloads and app restarts. No server, no cloud: a real local
// database that runs entirely in the browser.
// ============================================================================

import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { createJSONStorage, type StateStorage } from 'zustand/middleware'
import { expectHydration, markHydrated } from './hydration'

/** Namespace so all keys sit together under one obvious prefix in IndexedDB. */
export const storeKey = (name: string): string => `atelier-mode:${name}`

/** A string key/value store backed by IndexedDB, matching zustand's contract. */
const idbStringStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value)
  },
  removeItem: async (name) => {
    await idbDel(name)
  },
}

/** The persist `storage` option: JSON serialization on top of IndexedDB. */
export const idbStorage = () => createJSONStorage(() => idbStringStorage)

/**
 * Build the `onRehydrateStorage` callback and register the store with the
 * hydration gate. Invoked while the store is being created (module load), so
 * `expectHydration` runs synchronously before any async rehydration resolves.
 */
export const onRehydrate = (name: string) => {
  expectHydration(storeKey(name))
  return () => () => markHydrated(storeKey(name))
}
