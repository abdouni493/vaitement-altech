import { create } from 'zustand'
import type { Supplier } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_SUPPLIERS } from '@/data/seedData'

interface SupplierState {
  suppliers: Supplier[]
  addSupplier: (data: Omit<Supplier, 'id' | 'createdAt'>) => Supplier
  updateSupplier: (id: string, data: Partial<Supplier>) => void
  deleteSupplier: (id: string) => void
}

export const useSupplierStore = create<SupplierState>()((set) => ({
  suppliers: INITIAL_SUPPLIERS,
  addSupplier: (data) => {
    const supplier: Supplier = { ...data, id: uid('s'), createdAt: new Date().toISOString() }
    set((s) => ({ suppliers: [supplier, ...s.suppliers] }))
    return supplier
  },
  updateSupplier: (id, data) =>
    set((s) => ({ suppliers: s.suppliers.map((c) => (c.id === id ? { ...c, ...data } : c)) })),
  deleteSupplier: (id) => set((s) => ({ suppliers: s.suppliers.filter((c) => c.id !== id) })),
}))
