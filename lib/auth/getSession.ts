import { createClient } from '@/lib/supabase/server';
import type { Session } from '@supabase/supabase-js';

/**
 * Returns the current Supabase Session (includes access_token, refresh_token, etc.)
 * or null if unauthenticated.
 *
 * Prefer getUser() for identity checks.
 * Use getSession() when you specifically need the raw tokens.
 *
 * Use in: Server Components, Route Handlers.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) return null;
  return session;
}
