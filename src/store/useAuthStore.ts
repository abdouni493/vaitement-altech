import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppUser, Worker } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_USERS } from '@/data/seedData'
import { idbStorage, onRehydrate, storeKey } from './persist'
import { useWorkerStore } from './useWorkerStore'
import {
  getSessionProfile,
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
  /**
   * Re-checks the signed-in account once the stores are back from IndexedDB.
   * Runs on every boot so a page refresh keeps the session, while an account
   * that was deactivated or revoked meanwhile is signed out.
   */
  restoreSession: () => Promise<void>
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

      restoreSession: async () => {
        const user = get().currentUser
        if (!user) return

        // Staff sign in through their worker record, so the record stays the
        // source of truth: revoking the account, deactivating the worker or
        // narrowing their permissions takes effect on the next load.
        const worker = useWorkerStore.getState().workers.find((w) => w.id === user.id)
        if (worker) {
          set({ currentUser: worker.hasAccount && worker.active ? workerAsUser(worker) : null })
          return
        }

        // The owner's on-device account — refresh it in case the profile was
        // edited from the settings page on another tab.
        const local = get().users.find((u) => u.id === user.id)
        if (local) {
          set({ currentUser: local })
          return
        }

        // Anything else came from Supabase. Revalidate the stored session, but
        // keep the user signed in when the project is simply unreachable.
        if (!isSupabaseConfigured) return
        const check = await getSessionProfile()
        if (check.status === 'ok') set({ currentUser: profileAsUser(check.profile) })
        else if (check.status === 'signed-out') set({ currentUser: null })
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
      // Accounts *and* the active session persist, so a refresh lands the user
      // back on the page they were on instead of the login screen.
      // `restoreSession` revalidates that session on the next boot.
      partialize: (s) => ({ users: s.users, currentUser: s.currentUser }),
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
