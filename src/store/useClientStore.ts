import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Client } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_CLIENTS } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'

interface ClientState {
  clients: Client[]
  addClient: (data: Omit<Client, 'id' | 'createdAt'>) => Client
  updateClient: (id: string, data: Partial<Client>) => void
  deleteClient: (id: string) => void
}

export const useClientStore = create<ClientState>()(
  persist(
    (set) => ({
      clients: INITIAL_CLIENTS,
      addClient: (data) => {
        const client: Client = { ...data, id: uid('c'), createdAt: new Date().toISOString() }
        set((s) => ({ clients: [client, ...s.clients] }))
        return client
      },
      updateClient: (id, data) =>
        set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
    }),
    {
      name: storeKey('clients'),
      storage: idbStorage(),
      partialize: (s) => ({ clients: s.clients }),
      onRehydrateStorage: onRehydrate('clients'),
    },
  ),
)
