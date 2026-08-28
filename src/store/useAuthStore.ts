import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppUser, Worker } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_USERS } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'
import { useWorkerStore } from './useWorkerStore'
import {
  isSupabaseConfigured,
  signInWithSupabase,
  signOutFromSupabase,
  signUpAdminWithSupabase,
  type ProfileRow,
} from '@/lib/supabase'

/**
 * Staff sign in with the credentials captured on their worker record, and
 * carry exactly the permission set the owner granted them — nothing wider.
 */
const workerAsUser = (worker: Worker): AppUser => ({
  id: worker.id,
  fullName: worker.fullName,
  username: worker.username,
  email: worker.email,
  password: worker.password,
  role: worker.role,
  permissions: worker.permissions,
})

/** A Supabase profile row, rendered in the shape the interface consumes. */
const profileAsUser = (p: ProfileRow): AppUser => ({
  id: p.id,
  fullName: p.full_name,
  username: p.username,
  email: p.email,
  password: '',
  role: p.role,
  permissions: (p.is_admin ? 'ALL' : p.permissions) as AppUser['permissions'],
})

interface AuthState {
  users: AppUser[]
  currentUser: AppUser | null
  /**
   * Tries Supabase first when the project is configured, then falls back to the
   * on-device accounts — so the boutique still opens when the line is down.
   */
  login: (identifier: string, password: string) => Promise<AppUser | null>
  createAdmin: (data: {
    fullName: string
    username: string
    email: string
    password: string
  }) => Promise<AppUser>
  logout: () => void
  updateAccount: (
    data: Partial<Pick<AppUser, 'fullName' | 'username' | 'email' | 'password'>>,
  ) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: INITIAL_USERS,
      currentUser: null,

      login: async (identifier, password) => {
        const id = identifier.trim().toLowerCase()
        const matches = (email: string, username: string) =>
          email.toLowerCase() === id || username.toLowerCase() === id

        // Supabase owns the accounts when the project is reachable; an email
        // is required there, so a username sign-in goes straight to the local
        // store below.
        if (isSupabaseConfigured && id.includes('@')) {
          try {
            const profile = await signInWithSupabase(id, password)
            if (profile) {
              const user = profileAsUser(profile)
              set({ currentUser: user })
              return user
            }
          } catch {
            /* offline or project unreachable — fall through to local accounts */
          }
        }

        const owner = get().users.find((u) => matches(u.email, u.username) && u.password === password)
        if (owner) {
          set({ currentUser: owner })
          return owner
        }

        // Staff accounts live on the worker record; only active workers whose
        // account was switched on may sign in.
        const worker = useWorkerStore
          .getState()
          .workers.find(
            (w) =>
              w.hasAccount &&
              w.active &&
              matches(w.email ?? '', w.username ?? '') &&
              w.password === password,
          )
        if (worker) {
          const user = workerAsUser(worker)
          set({ currentUser: user })
          return user
        }

        return null
      },

      createAdmin: async ({ fullName, username, email, password }) => {
        // Mirror the owner into Supabase auth when configured; a failure there
        // (offline, email already taken) must not block the local install.
        if (isSupabaseConfigured) {
          try {
            await signUpAdminWithSupabase({ email, password, fullName, username })
          } catch {
            /* keep going with the on-device account */
          }
        }
        const user: AppUser = {
          id: uid('user'),
          fullName,
          username,
          email,
          password,
          role: 'Administrateur',
          permissions: 'ALL',
        }
        set((s) => ({ users: [user, ...s.users], currentUser: user }))
        return user
      },

      logout: () => {
        void signOutFromSupabase()
        set({ currentUser: null })
      },

      updateAccount: (data) =>
        set((s) => {
          if (!s.currentUser) return s
          const updated = { ...s.currentUser, ...data }
          return {
            currentUser: updated,
            users: s.users.map((u) => (u.id === updated.id ? updated : u)),
          }
        }),
    }),
    {
      name: storeKey('auth'),
      storage: idbStorage(),
      // Accounts persist; the active session does not — login is required each time.
      partialize: (s) => ({ users: s.users }),
      onRehydrateStorage: onRehydrate('auth'),
    },
  ),
)

/**
 * `true` once the boutique has an owner account. The login screen's
 * "create admin" flow is offered only while this is `false`, so the button
 * disappears the moment the first administrator is registered.
 */
export const hasAdmin = (users: AppUser[]): boolean =>
  users.some((u) => u.permissions === 'ALL' || u.role === 'Administrateur')
