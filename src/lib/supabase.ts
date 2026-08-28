import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ============================================================================
// Supabase connection
// ----------------------------------------------------------------------------
// The boutique runs local-first: every store reads and writes IndexedDB, so the
// app is fully usable with no network. Supabase is the shared backend on top of
// that — it owns the accounts (auth.users + profiles), the storage buckets that
// serve the storefront images, and the tables described in `supabase/`.
//
// The client is created only when both variables are present, so a checkout
// without an `.env` still boots instead of throwing at module load.
// ============================================================================

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The storefront and the back office share one origin, so one key is
        // enough; naming it explicitly keeps it out of the way of other apps.
        storageKey: 'atelier-mode.auth',
      },
    })
  : null

/** The row `public.profiles` holds for every account, staff included. */
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

/**
 * Sign in against Supabase. Returns `null` when Supabase is not configured or
 * the credentials are rejected, which lets the caller fall back to the local
 * account store without special-casing the offline install.
 */
export const signInWithSupabase = async (
  email: string,
  password: string,
): Promise<ProfileRow | null> => {
  if (!supabase) return null
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, role, is_admin, permissions, active')
    .eq('id', data.user.id)
    .single()

  if (!profile || profile.active === false) {
    await supabase.auth.signOut()
    return null
  }
  return profile as ProfileRow
}

/**
 * Register the owner account. The `handle_new_user` trigger in the schema
 * creates the matching `profiles` row, so nothing is inserted here.
 */
export const signUpAdminWithSupabase = async (data: {
  email: string
  password: string
  fullName: string
  username: string
}): Promise<{ ok: boolean; message?: string }> => {
  if (!supabase) return { ok: false, message: 'not-configured' }
  const { error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName, username: data.username, is_admin: true },
    },
  })
  return error ? { ok: false, message: error.message } : { ok: true }
}

export const signOutFromSupabase = async (): Promise<void> => {
  await supabase?.auth.signOut()
}

/** Public URL of a file in one of the storefront's buckets. */
export const publicAssetUrl = (bucket: string, path: string): string => {
  if (!supabase || !path) return path
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
