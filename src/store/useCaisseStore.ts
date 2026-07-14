import { create } from 'zustand'
import type { CaisseTransaction } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_CAISSE } from '@/data/seedData'

interface CaisseState {
  transactions: CaisseTransaction[]
  addTransaction: (data: Omit<CaisseTransaction, 'id' | 'createdAt'>) => CaisseTransaction
  updateTransaction: (id: string, data: Partial<CaisseTransaction>) => void
  deleteTransaction: (id: string) => void
}

export const useCaisseStore = create<CaisseState>()((set) => ({
  transactions: INITIAL_CAISSE,
  addTransaction: (data) => {
    const tx: CaisseTransaction = { ...data, id: uid('cx'), createdAt: new Date().toISOString() }
    set((s) => ({ transactions: [tx, ...s.transactions] }))
    return tx
  },
  updateTransaction: (id, data) =>
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...data } : t)) })),
  deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
}))
