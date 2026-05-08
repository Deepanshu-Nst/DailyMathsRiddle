import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Returns the authenticated Supabase User from the server-side session,
 * or null if there is no valid session.
 *
 * Uses getUser() (not getSession()) to validate the JWT against Supabase Auth
 * on every call — this is the secure pattern recommended by Supabase.
 *
 * Use in: Server Components, Route Handlers.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user;
}
