import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Layout for the (protected) route group.
 * All child routes require authentication — middleware handles the
 * primary guard, but this layout provides a server-side fallback.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Secondary guard — middleware is primary.
  // This ensures even if middleware is misconfigured, protected pages fail safely.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return <>{children}</>;
}
