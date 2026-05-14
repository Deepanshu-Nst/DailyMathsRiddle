import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Server-side guard to require 'admin' role.
 * Throws 403 or redirects if unauthorized.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log('[ADMIN BLOCKED] No authenticated user');
    redirect('/forbidden');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  if (!profile || profile.role !== 'admin') {
    console.log(`[ADMIN BLOCKED] user: ${user.id}, role: ${profile?.role || 'none'}`);
    redirect('/forbidden');
  }

  console.log(`[ADMIN AUTHORIZED] user: ${user.id}`);
  return { user, profile };
}

/**
 * Non-throwing version for use in Layouts or where custom handling is needed.
 */
export async function getAdminStatus() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null };

  return { 
    isAdmin: profile?.role === 'admin',
    isModerator: profile?.role === 'moderator' || profile?.role === 'admin',
    user,
    profile
  };
}
