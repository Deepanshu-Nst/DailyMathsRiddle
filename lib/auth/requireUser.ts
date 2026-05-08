import { redirect } from 'next/navigation';
import { getUser } from './getUser';
import type { User } from '@supabase/supabase-js';

/**
 * Guards a Server Component or Route Handler.
 * Returns the authenticated user or redirects to /login.
 *
 * Usage (top of a Server Component):
 *   const user = await requireUser();
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
