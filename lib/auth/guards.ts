import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUser } from './getUser';

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/');
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile as any).role !== 'admin') {
    redirect('/');
  }

  return user;
}

export async function getUserProfile() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
