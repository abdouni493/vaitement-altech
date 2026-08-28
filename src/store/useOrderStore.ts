import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WebOrder, WebOrderLine, WebOrderStatus, DeliveryMode } from '@/types'
import { uid, round2 } from '@/utils/helpers'
import { idbStorage, onRehydrate, storeKey } from './persist'
import { useProductStore } from './useProductStore'
import { useCaisseStore } from './useCaisseStore'

// ----------------------------------------------------------------------------
// Side effects on the rest of the boutique
// ----------------------------------------------------------------------------

/**
 * Stock only moves when the parcel physically leaves — on `delivered` — and
 * comes back on `returned`. `stockAppliedAt` guards the transition so an edit,
 * a double click or a re-accept can never decrement twice.
 */
const takeStock = (lines: WebOrderLine[]) => {
  const { reduceStock } = useProductStore.getState()
  lines.forEach((l) => reduceStock(l.productId, l.size, l.quantity))
}

const giveStockBack = (lines: WebOrderLine[]) => {
  const { products, updateProduct } = useProductStore.getState()
  lines.forEach((l) => {
    const product = products.find((p) => p.id === l.productId)
    if (!product) return
    if (product.sizes.length === 0 && !l.size) {
      updateProduct(product.id, { quantity: product.quantity + l.quantity })
      return
    }
    const exists = product.sizes.some((s) => s.size === l.size)
    const sizes = exists
      ? product.sizes.map((s) => (s.size === l.size ? { ...s, quantity: s.quantity + l.quantity } : s))
      : [...product.sizes, { size: l.size, quantity: l.quantity }]
    // `updateProduct` re-derives the article total from the size breakdown.
    updateProduct(product.id, { sizes })
  })
}

const bookRevenue = (order: WebOrder) => {
  useCaisseStore.getState().addTransaction({
    type: 'deposit',
    amount: order.total,
    description: `Commande web ${order.reference} — ${order.customerName}`,
    date: new Date().toISOString(),
  })
}

const stamp = (order: WebOrder, status: WebOrderStatus, note?: string): WebOrder => ({
  ...order,
  status,
  history: [...order.history, { status, at: new Date().toISOString(), note }],
})

// ----------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------

export interface NewOrderInput {
  customerName: string
  phone: string
  wilayaCode: string
  wilaya: string
  commune: string
  address: string
  deliveryMode: DeliveryMode
  deliveryCompanyId: string | null
  deliveryCompanyName: string
  deliveryPrice: number
  lines: WebOrderLine[]
  note?: string
}

interface OrderState {
  orders: WebOrder[]
  /** Monotonic counter behind the human-readable reference. */
  counter: number

  addOrder: (data: NewOrderInput) => WebOrder
  updateOrder: (id: string, data: Partial<WebOrder>) => void
  deleteOrder: (id: string) => void

  /** pending | canceled → accepted. */
  acceptOrder: (id: string) => void
  /** Anything → canceled; returns stock if it had already left. */
  cancelOrder: (id: string, note?: string) => void
  /** accepted → delivered: assigns the carrier and takes the stock out. */
  deliverOrder: (id: string, companyId: string, companyName: string, price?: number) => void
  /** delivered → returned: the customer refused, stock comes back. */
  returnOrder: (id: string, note?: string) => void
  /** delivered → completed: the money is booked into the caisse. */
  cashOrder: (id: string) => void
}

/** Recompute an order's money from its lines and carrier tariff. */
export const priceOrder = (lines: WebOrderLine[], deliveryPrice: number) => {
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0))
  return { subtotal, total: round2(subtotal + deliveryPrice) }
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      counter: 0,

      addOrder: (data) => {
        const next = get().counter + 1
        const { subtotal, total } = priceOrder(data.lines, data.deliveryPrice)
        const now = new Date().toISOString()
        const order: WebOrder = {
          ...data,
          id: uid('web'),
          reference: `WEB-${String(next).padStart(6, '0')}`,
          subtotal,
          total,
          status: 'pending',
          note: data.note ?? '',
          history: [{ status: 'pending', at: now }],
          createdAt: now,
        }
        set((s) => ({ orders: [order, ...s.orders], counter: next }))
        return order
      },

      updateOrder: (id, data) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== id) return o
            const merged = { ...o, ...data }
            return { ...merged, ...priceOrder(merged.lines, merged.deliveryPrice) }
          }),
        })),

      deleteOrder: (id) =>
        set((s) => {
          const order = s.orders.find((o) => o.id === id)
          // Deleting an order whose stock is still out puts the articles back.
          if (order?.stockAppliedAt) giveStockBack(order.lines)
          return { orders: s.orders.filter((o) => o.id !== id) }
        }),

      acceptOrder: (id) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? stamp(o, 'accepted') : o)),
        })),

      cancelOrder: (id, note) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== id) return o
            if (o.stockAppliedAt) {
              giveStockBack(o.lines)
              return { ...stamp(o, 'canceled', note), stockAppliedAt: undefined }
            }
            return stamp(o, 'canceled', note)
          }),
        })),

      deliverOrder: (id, companyId, companyName, price) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== id) return o
            if (!o.stockAppliedAt) takeStock(o.lines)
            const deliveryPrice = price ?? o.deliveryPrice
            const next: WebOrder = {
              ...stamp(o, 'delivered', companyName),
              deliveryCompanyId: companyId,
              deliveryCompanyName: companyName,
              deliveryPrice,
              stockAppliedAt: o.stockAppliedAt ?? new Date().toISOString(),
            }
            return { ...next, ...priceOrder(next.lines, deliveryPrice) }
          }),
        })),

      returnOrder: (id, note) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== id) return o
            if (o.stockAppliedAt) giveStockBack(o.lines)
            return { ...stamp(o, 'returned', note), stockAppliedAt: undefined }
          }),
        })),

      cashOrder: (id) => {
        const order = get().orders.find((o) => o.id === id)
        if (!order || order.cashedAt) return
        bookRevenue(order)
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id ? { ...stamp(o, 'completed'), cashedAt: new Date().toISOString() } : o,
          ),
        }))
      },
    }),
    {
      name: storeKey('weborders'),
      storage: idbStorage(),
      partialize: (s) => ({ orders: s.orders, counter: s.counter }),
      onRehydrateStorage: onRehydrate('weborders'),
    },
  ),
)

// ----------------------------------------------------------------------------
// Selectors
// ----------------------------------------------------------------------------

/** Orders still waiting for the owner to act — drives the sidebar badge. */
export const pendingCount = (orders: WebOrder[]): number =>
  orders.filter((o) => o.status === 'pending').length

/** Every stage that still needs attention (new, accepted, or out for delivery). */
export const openCount = (orders: WebOrder[]): number =>
  orders.filter((o) => o.status === 'pending' || o.status === 'accepted' || o.status === 'delivered')
    .length

export const countByStatus = (orders: WebOrder[]): Record<WebOrderStatus, number> => {
  const out: Record<WebOrderStatus, number> = {
    pending: 0,
    accepted: 0,
    delivered: 0,
    completed: 0,
    canceled: 0,
    returned: 0,
  }
  orders.forEach((o) => {
    out[o.status] += 1
  })
  return out
}
