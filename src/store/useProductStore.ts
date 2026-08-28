import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, SizeCategory, SizeStock } from '@/types'
import { uid, sumSizes, compareSizes } from '@/utils/helpers'
import {
  INITIAL_PRODUCTS,
  INITIAL_BRANDS,
  INITIAL_CATEGORIES,
  INITIAL_SIZE_SCALES,
  INITIAL_COLORS,
  INITIAL_MATERIALS,
} from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'

interface ProductState {
  products: Product[]
  brands: string[]
  categories: string[]
  colors: string[]
  materials: string[]
  /** The boutique's size scales, per family. The user can extend any of them. */
  sizeScales: Record<SizeCategory, string[]>

  addProduct: (data: Omit<Product, 'id' | 'createdAt' | 'quantity'>) => Product
  updateProduct: (id: string, data: Partial<Product>) => void
  deleteProduct: (id: string) => void
  /** Increase stock for one size + refresh prices/threshold after a purchase line. */
  receiveStock: (
    productId: string,
    size: string,
    qty: number,
    patch: { purchasePrice: number; salePrice: number; minQuantity: number },
  ) => void
  /** Decrease stock for one size after a sale. */
  reduceStock: (productId: string, size: string, qty: number) => void

  addBrand: (name: string) => void
  addCategory: (name: string) => void
  addColor: (name: string) => void
  addMaterial: (name: string) => void
  /** Register a new size on a scale so it becomes selectable everywhere. */
  addSize: (category: SizeCategory, size: string) => void
}

/** Recompute the total from the size breakdown (sized articles only). */
const withTotal = (p: Product): Product =>
  p.sizes.length > 0 ? { ...p, quantity: sumSizes(p.sizes) } : p

/** Apply a delta to one size, creating the size row if the article lacks it. */
const applyToSize = (sizes: SizeStock[], size: string, delta: number): SizeStock[] => {
  const exists = sizes.some((s) => s.size === size)
  const next = exists
    ? sizes.map((s) => (s.size === size ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s))
    : [...sizes, { size, quantity: Math.max(0, delta) }]
  return next.sort((a, b) => compareSizes(a.size, b.size))
}

export const useProductStore = create<ProductState>()(
  persist(
    (set) => ({
  products: INITIAL_PRODUCTS,
  brands: INITIAL_BRANDS,
  categories: INITIAL_CATEGORIES,
  colors: INITIAL_COLORS,
  materials: INITIAL_MATERIALS,
  sizeScales: INITIAL_SIZE_SCALES,

  addProduct: (data) => {
    const product = withTotal({
      ...data,
      quantity: 0,
      id: uid('p'),
      createdAt: new Date().toISOString(),
    })
    set((s) => ({ products: [product, ...s.products] }))
    return product
  },

  updateProduct: (id, data) =>
    set((s) => ({
      products: s.products.map((p) => (p.id === id ? withTotal({ ...p, ...data }) : p)),
    })),

  deleteProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

  receiveStock: (productId, size, qty, patch) =>
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== productId) return p
        // Unsized article: the purchase feeds the total directly.
        if (p.sizes.length === 0 && !size) {
          return { ...p, ...patch, quantity: p.quantity + qty }
        }
        return withTotal({ ...p, ...patch, sizes: applyToSize(p.sizes, size, qty) })
      }),
    })),

  reduceStock: (productId, size, qty) =>
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== productId) return p
        if (p.sizes.length === 0 && !size) {
          return { ...p, quantity: Math.max(0, p.quantity - qty) }
        }
        return withTotal({ ...p, sizes: applyToSize(p.sizes, size, -qty) })
      }),
    })),

  addBrand: (name) => set((s) => (s.brands.includes(name) ? s : { brands: [...s.brands, name] })),
  addCategory: (name) =>
    set((s) => (s.categories.includes(name) ? s : { categories: [...s.categories, name] })),
  addColor: (name) => set((s) => (s.colors.includes(name) ? s : { colors: [...s.colors, name] })),
  addMaterial: (name) =>
    set((s) => (s.materials.includes(name) ? s : { materials: [...s.materials, name] })),

  addSize: (category, size) =>
    set((s) => {
      const scale = s.sizeScales[category] ?? []
      if (scale.includes(size)) return s
      return {
        sizeScales: {
          ...s.sizeScales,
          [category]: [...scale, size].sort(compareSizes),
        },
      }
    }),
    }),
    {
      name: storeKey('products'),
      storage: idbStorage(),
      partialize: (s) => ({
        products: s.products,
        brands: s.brands,
        categories: s.categories,
        colors: s.colors,
        materials: s.materials,
        sizeScales: s.sizeScales,
      }),
      onRehydrateStorage: onRehydrate('products'),
    },
  ),
)
