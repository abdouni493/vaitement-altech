import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Sale, Payment } from '@/types'
import { uid, round2 } from '@/utils/helpers'
import { INITIAL_SALES } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'

interface SalesState {
  sales: Sale[]
  addSale: (data: Omit<Sale, 'id' | 'reference' | 'createdAt'>) => Sale
  updateSale: (id: string, data: Partial<Sale>) => void
  deleteSale: (id: string) => void
  addPayment: (saleId: string, amount: number, date: string, note?: string) => void
}

const nextRef = (sales: Sale[]): string => {
  const year = new Date().getFullYear()
  const n = sales.length + 1
  return `VTE-${year}-${String(n).padStart(3, '0')}`
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set, get) => ({
      sales: INITIAL_SALES,
      addSale: (data) => {
        const sale: Sale = {
          ...data,
          id: uid('sa'),
          reference: nextRef(get().sales),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ sales: [sale, ...s.sales] }))
        return sale
      },
      updateSale: (id, data) =>
        set((s) => ({ sales: s.sales.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
      deleteSale: (id) => set((s) => ({ sales: s.sales.filter((p) => p.id !== id) })),
      addPayment: (saleId, amount, date, note) =>
        set((s) => ({
          sales: s.sales.map((sale) => {
            if (sale.id !== saleId) return sale
            const payment: Payment = { id: uid('pay'), amount, date, note }
            return { ...sale, paid: round2(sale.paid + amount), payments: [...sale.payments, payment] }
          }),
        })),
    }),
    {
      name: storeKey('sales'),
      storage: idbStorage(),
      partialize: (s) => ({ sales: s.sales }),
      onRehydrateStorage: onRehydrate('sales'),
    },
  ),
)
