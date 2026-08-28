import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StoreSettings } from '@/types'
import { INITIAL_SETTINGS } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'

interface SettingsState {
  settings: StoreSettings
  updateSettings: (data: Partial<StoreSettings>) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: INITIAL_SETTINGS,
      updateSettings: (data) => set((s) => ({ settings: { ...s.settings, ...data } })),
    }),
    {
      name: storeKey('settings'),
      storage: idbStorage(),
      partialize: (s) => ({ settings: s.settings }),
      onRehydrateStorage: onRehydrate('settings'),
    },
  ),
)
