import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Purchase, Payment } from '@/types'
import { uid, round2 } from '@/utils/helpers'
import { INITIAL_PURCHASES } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'

interface PurchaseState {
  purchases: Purchase[]
  addPurchase: (data: Omit<Purchase, 'id' | 'reference' | 'createdAt'>) => Purchase
  updatePurchase: (id: string, data: Partial<Purchase>) => void
  deletePurchase: (id: string) => void
  addPayment: (purchaseId: string, amount: number, date: string, note?: string) => void
}

const nextRef = (purchases: Purchase[]): string => {
  const year = new Date().getFullYear()
  const n = purchases.length + 1
  return `ACH-${year}-${String(n).padStart(3, '0')}`
}

export const usePurchaseStore = create<PurchaseState>()(
  persist(
    (set, get) => ({
      purchases: INITIAL_PURCHASES,
      addPurchase: (data) => {
        const purchase: Purchase = {
          ...data,
          id: uid('pu'),
          reference: nextRef(get().purchases),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ purchases: [purchase, ...s.purchases] }))
        return purchase
      },
      updatePurchase: (id, data) =>
        set((s) => ({
          purchases: s.purchases.map((p) => (p.id === id ? { ...p, ...data } : p)),
        })),
      deletePurchase: (id) => set((s) => ({ purchases: s.purchases.filter((p) => p.id !== id) })),
      addPayment: (purchaseId, amount, date, note) =>
        set((s) => ({
          purchases: s.purchases.map((p) => {
            if (p.id !== purchaseId) return p
            const payment: Payment = { id: uid('pay'), amount, date, note }
            return { ...p, paid: round2(p.paid + amount), payments: [...p.payments, payment] }
          }),
        })),
    }),
    {
      name: storeKey('purchases'),
      storage: idbStorage(),
      partialize: (s) => ({ purchases: s.purchases }),
      onRehydrateStorage: onRehydrate('purchases'),
    },
  ),
)
