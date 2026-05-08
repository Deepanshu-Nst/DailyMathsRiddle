import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/getUser';

/**
 * Layout for the (auth) route group — /login and future auth pages.
 * If the user is already authenticated, redirect to /dashboard.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (user) redirect('/dashboard');

  return <>{children}</>;
}
