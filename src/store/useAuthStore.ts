import { create } from 'zustand'
import type { AppUser } from '@/types'
import { uid } from '@/utils/helpers'
import { INITIAL_USERS } from '@/data/seedData'

interface AuthState {
  users: AppUser[]
  currentUser: AppUser | null
  login: (identifier: string, password: string) => AppUser | null
  createAdmin: (data: { fullName: string; username: string; email: string; password: string }) => AppUser
  logout: () => void
  updateAccount: (data: Partial<Pick<AppUser, 'fullName' | 'username' | 'email' | 'password'>>) => void
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  users: INITIAL_USERS,
  currentUser: null,
  login: (identifier, password) => {
    const id = identifier.trim().toLowerCase()
    const user = get().users.find(
      (u) =>
        (u.email.toLowerCase() === id || u.username.toLowerCase() === id) && u.password === password,
    )
    if (user) set({ currentUser: user })
    return user ?? null
  },
  createAdmin: ({ fullName, username, email, password }) => {
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
  logout: () => set({ currentUser: null }),
  updateAccount: (data) =>
    set((s) => {
      if (!s.currentUser) return s
      const updated = { ...s.currentUser, ...data }
      return {
        currentUser: updated,
        users: s.users.map((u) => (u.id === updated.id ? updated : u)),
      }
    }),
}))
