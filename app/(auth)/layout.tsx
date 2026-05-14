import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Layout for the (auth) route group — /login and future auth pages.
 * If the user is already authenticated, redirect to /dashboard.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return <>{children}</>;
}
