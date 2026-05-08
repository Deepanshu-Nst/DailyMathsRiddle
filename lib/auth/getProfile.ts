import { createClient } from '@/lib/supabase/server';
import type { UserProfile } from './types';

/**
 * Fetches the profile row from public.profiles for a given user ID.
 * Returns null if the profile doesn't exist yet (e.g. trigger hasn't run).
 *
 * Use in: Server Components, Route Handlers.
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/**
 * Fetches the profile of the currently authenticated user.
 * Returns null if unauthenticated or profile not found.
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfile(user.id);
}
