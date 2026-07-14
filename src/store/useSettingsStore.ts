import { create } from 'zustand'
import type { StoreSettings } from '@/types'
import { INITIAL_SETTINGS } from '@/data/seedData'

interface SettingsState {
  settings: StoreSettings
  updateSettings: (data: Partial<StoreSettings>) => void
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: INITIAL_SETTINGS,
  updateSettings: (data) => set((s) => ({ settings: { ...s.settings, ...data } })),
}))
