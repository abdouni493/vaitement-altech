// ----------------------------------------------------------------------------
// Backup / restore
// ----------------------------------------------------------------------------
// The app holds all state in memory (no database, no localStorage), so a backup
// is a snapshot of the stores and a restore writes straight back into them.
// ----------------------------------------------------------------------------

import { useProductStore } from '@/store/useProductStore'
import { usePurchaseStore } from '@/store/usePurchaseStore'
import { useSalesStore } from '@/store/useSalesStore'
import { useClientStore } from '@/store/useClientStore'
import { useSupplierStore } from '@/store/useSupplierStore'
import { useWorkerStore } from '@/store/useWorkerStore'
import { useExpenseStore } from '@/store/useExpenseStore'
import { useSettingsStore } from '@/store/useSettingsStore'
import { useCaisseStore } from '@/store/useCaisseStore'

/** Every slice of the boutique's data, keyed by section name. */
const snapshot = () => ({
  products: {
    products: useProductStore.getState().products,
    brands: useProductStore.getState().brands,
    categories: useProductStore.getState().categories,
    colors: useProductStore.getState().colors,
    materials: useProductStore.getState().materials,
    sizeScales: useProductStore.getState().sizeScales,
  },
  purchases: { purchases: usePurchaseStore.getState().purchases },
  sales: { sales: useSalesStore.getState().sales },
  clients: { clients: useClientStore.getState().clients },
  suppliers: { suppliers: useSupplierStore.getState().suppliers },
  workers: { workers: useWorkerStore.getState().workers, roles: useWorkerStore.getState().roles },
  expenses: { expenses: useExpenseStore.getState().expenses },
  settings: { settings: useSettingsStore.getState().settings },
  caisse: { transactions: useCaisseStore.getState().transactions },
})

type Snapshot = ReturnType<typeof snapshot>

export const exportData = (): void => {
  const payload = {
    __atelierMode: true,
    exportedAt: new Date().toISOString(),
    data: snapshot(),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `atelier-mode-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export const importData = (file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        const data: Partial<Snapshot> = parsed.data ?? parsed

        // Merge each section into its store, leaving actions untouched.
        if (data.products) useProductStore.setState(data.products)
        if (data.purchases) usePurchaseStore.setState(data.purchases)
        if (data.sales) useSalesStore.setState(data.sales)
        if (data.clients) useClientStore.setState(data.clients)
        if (data.suppliers) useSupplierStore.setState(data.suppliers)
        if (data.workers) useWorkerStore.setState(data.workers)
        if (data.expenses) useExpenseStore.setState(data.expenses)
        if (data.settings) useSettingsStore.setState(data.settings)
        if (data.caisse) useCaisseStore.setState(data.caisse)

        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
