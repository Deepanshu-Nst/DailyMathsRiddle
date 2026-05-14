import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Server-side guard to require 'moderator' or 'admin' role.
 */
export async function requireModerator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/forbidden');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  const isAuthorized = profile?.role === 'moderator' || profile?.role === 'admin';

  if (!isAuthorized) {
    console.log(`[MODERATOR BLOCKED] user: ${user.id}, role: ${profile?.role || 'none'}`);
    redirect('/forbidden');
  }

  console.log(`[MODERATOR AUTHORIZED] user: ${user.id}`);
  return { user, profile };
}
