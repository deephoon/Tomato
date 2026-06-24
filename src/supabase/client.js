import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Returns the current authenticated user synchronously from the local session cache.
 * Note: This might be null if the session hasn't been fetched from the server yet
 * on first load, but usually available immediately if a local session exists.
 */
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return {
    ...user,
    displayName: user.user_metadata?.display_name || user.email?.split('@')[0],
    handle: user.email?.split('@')[0]
  };
}

/**
 * Throws an error if no user is currently authenticated.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('authErrorRequiresLogin: User must be logged in.');
  }
  return user;
}
