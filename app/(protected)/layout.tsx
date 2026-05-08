import { requireUser } from '@/lib/auth/requireUser';

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
  await requireUser();

  return <>{children}</>;
}
