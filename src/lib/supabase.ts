// ============================================================================
// Authentication — demo mode, no database
// ----------------------------------------------------------------------------
// Every database connection was removed from this build. There is no Supabase
// project, no network call and no persisted backend: accounts, sessions and
// the "does an owner exist?" question are all answered from the constant
// records in `src/data/mockData.ts`, held in memory for the life of the tab.
//
// The module keeps the exact same exported surface the rest of the app already
// consumes, so nothing else had to change. `supabase` is exported as `null`,
// which is the signal the image helpers already understood as "store bytes
// locally", and the back office reads and writes through `src/lib/db.ts`, which
// is now an in-memory store rather than a Postgres client.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ACCOUNTS, DEMO_ADMIN, DEMO_CREDENTIALS } from '@/data/mockData'

/**
 * There is no Supabase client any more: every database connection was removed.
 * The value is always `null`, which the image helpers already read as "keep the
 * bytes locally". It keeps the `SupabaseClient | null` type only so those
 * offline-fallback branches still type-check.
 */
export const supabase: SupabaseClient | null = null

/** The app is always "configured": the demo backend is built in. */
export const isSupabaseConfigured = true

/** The row the interface consumes for every account. */
export interface ProfileRow {
  id: string
  full_name: string
  username: string
  email: string
  role: string
  is_admin: boolean
  /** `"ALL"` for the owner, otherwise the module/action matrix. */
  permissions: unknown
  active: boolean
}

/** What went wrong, in the language the interface speaks. */
export class AuthError extends Error {}

// ----------------------------------------------------------------------------
// Session (persisted only in this tab's memory)
// ----------------------------------------------------------------------------

const SESSION_KEY = 'atelier-mode.demo-session'

const readStoredSession = (): ProfileRow | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const id = JSON.parse(raw) as string
    return DEMO_ACCOUNTS.find((a) => a.id === id) ?? null
  } catch {
    return null
  }
}

const writeStoredSession = (profile: ProfileRow | null) => {
  try {
    if (profile) localStorage.setItem(SESSION_KEY, JSON.stringify(profile.id))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* storage unavailable — the session simply won't survive a refresh */
  }
}

/** Look an account up by e-mail (case-insensitive). */
const accountByEmail = (email: string): ProfileRow | null =>
  DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase()) ?? null

// ----------------------------------------------------------------------------
// Sign-in
// ----------------------------------------------------------------------------

/**
 * Sign in against the demo accounts.
 *
 * Any password is accepted for a known e-mail — this is a demonstration build
 * with no credentials to verify. An unknown e-mail returns `null` so the login
 * screen still shows "wrong credentials", and a deactivated account throws so
 * it can show the right message.
 */
export const signInWithSupabase = async (
  email: string,
  _password: string,
): Promise<ProfileRow | null> => {
  const profile = accountByEmail(email)
  if (!profile) return null
  if (profile.active === false) throw new AuthError('account-disabled')
  writeStoredSession(profile)
  return profile
}

/** Sign in as the built-in demo administrator. Used by the "Demo" button. */
export const signInDemo = async (): Promise<ProfileRow> => {
  writeStoredSession(DEMO_ADMIN)
  return DEMO_ADMIN
}

export const DEMO_LOGIN = DEMO_CREDENTIALS

/** What the stored session amounts to when the app boots again. */
export type SessionCheck =
  | { status: 'ok'; profile: ProfileRow }
  | { status: 'signed-out' }
  | { status: 'unreachable' }

export const getSessionProfile = async (): Promise<SessionCheck> => {
  const profile = readStoredSession()
  return profile ? { status: 'ok', profile } : { status: 'signed-out' }
}

/**
 * Does the boutique already have an owner?
 *
 * In the demo build the owner always exists, so the create-admin flow stays
 * retired on the login screen.
 */
export const adminExistsInSupabase = async (): Promise<
  { ok: true; exists: boolean } | { ok: false; message: string }
> => ({ ok: true, exists: true })

export interface SignUpResult {
  ok: boolean
  signedIn?: boolean
  message?: string
}

/**
 * Register an owner account. The demo already has one, so this simply signs the
 * caller into the built-in administrator rather than creating a second owner.
 */
export const signUpAdminWithSupabase = async (_data: {
  email: string
  password: string
  fullName: string
  username: string
}): Promise<SignUpResult> => {
  writeStoredSession(DEMO_ADMIN)
  return { ok: true, signedIn: true }
}

/** Creating a staff sign-in is a no-op success in the demo build. */
export const provisionWorkerAccount = async (_data: {
  email: string
  password: string
  fullName: string
  username: string
  workerId: string
  role: string
}): Promise<SignUpResult> => ({ ok: true })

export const signOutFromSupabase = async (): Promise<void> => {
  writeStoredSession(null)
}

/** Public URL of a stored asset — in the demo build the value is already usable. */
export const publicAssetUrl = (_bucket: string, path: string): string => path
