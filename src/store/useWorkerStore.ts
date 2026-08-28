import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Worker, WorkerAdvance, WorkerAbsence, WorkerPayment, Permissions } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_WORKERS, INITIAL_ROLES } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'

interface WorkerState {
  workers: Worker[]
  roles: string[]
  addWorker: (data: Omit<Worker, 'id' | 'createdAt' | 'advances' | 'absences' | 'payments'>) => Worker
  updateWorker: (id: string, data: Partial<Worker>) => void
  deleteWorker: (id: string) => void
  setPermissions: (id: string, permissions: Permissions) => void
  addRole: (name: string) => void
  addAdvance: (workerId: string, advance: Omit<WorkerAdvance, 'id' | 'deducted'>) => void
  addAbsence: (workerId: string, absence: Omit<WorkerAbsence, 'id'>) => void
  addPayment: (workerId: string, payment: Omit<WorkerPayment, 'id'>) => void
}

export const useWorkerStore = create<WorkerState>()(
  persist(
    (set) => ({
  workers: INITIAL_WORKERS,
  roles: INITIAL_ROLES,
  addWorker: (data) => {
    const worker: Worker = {
      ...data,
      id: uid('w'),
      advances: [],
      absences: [],
      payments: [],
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ workers: [worker, ...s.workers] }))
    return worker
  },
  updateWorker: (id, data) =>
    set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, ...data } : w)) })),
  deleteWorker: (id) => set((s) => ({ workers: s.workers.filter((w) => w.id !== id) })),
  setPermissions: (id, permissions) =>
    set((s) => ({ workers: s.workers.map((w) => (w.id === id ? { ...w, permissions } : w)) })),
  addRole: (name) => set((s) => (s.roles.includes(name) ? s : { roles: [...s.roles, name] })),
  addAdvance: (workerId, advance) =>
    set((s) => ({
      workers: s.workers.map((w) =>
        w.id === workerId
          ? { ...w, advances: [{ ...advance, id: uid('adv'), deducted: false }, ...w.advances] }
          : w,
      ),
    })),
  addAbsence: (workerId, absence) =>
    set((s) => ({
      workers: s.workers.map((w) =>
        w.id === workerId ? { ...w, absences: [{ ...absence, id: uid('abs') }, ...w.absences] } : w,
      ),
    })),
  addPayment: (workerId, payment) =>
    set((s) => ({
      workers: s.workers.map((w) => {
        if (w.id !== workerId) return w
        return {
          ...w,
          payments: [{ ...payment, id: uid('wp') }, ...w.payments],
          // mark all advances as deducted once a salary payment is recorded
          advances: w.advances.map((a) => ({ ...a, deducted: true })),
        }
      }),
    })),
    }),
    {
      name: storeKey('workers'),
      storage: idbStorage(),
      partialize: (s) => ({ workers: s.workers, roles: s.roles }),
      onRehydrateStorage: onRehydrate('workers'),
    },
  ),
)
