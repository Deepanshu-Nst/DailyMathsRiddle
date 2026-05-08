'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthGuardProps {
  /** Content to show when authenticated */
  children: (user: User) => React.ReactNode;
  /** Optional: content to show while session is resolving */
  fallback?: React.ReactNode;
  /** Optional: content to show when not authenticated */
  unauthenticated?: React.ReactNode;
}

/**
 * AuthGuard — client-side auth state wrapper.
 * Use when a Client Component needs to conditionally render based on auth state.
 *
 * Prefer Server Component auth guards (requireUser) for sensitive content.
 * Use AuthGuard only for non-sensitive UI gating in Client Components.
 *
 * Usage:
 *   <AuthGuard fallback={<Spinner />} unauthenticated={<LoginPrompt />}>
 *     {(user) => <ProtectedContent user={user} />}
 *   </AuthGuard>
 */
export default function AuthGuard({
  children,
  fallback,
  unauthenticated,
}: AuthGuardProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Session resolving
  if (user === undefined) {
    return (
      <>
        {fallback ?? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
          >
            <div
              aria-label="Loading"
              style={{
                width: 20,
                height: 20,
                border: '2px solid var(--border)',
                borderTopColor: 'var(--text-3)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }}
            />
          </div>
        )}
      </>
    );
  }

  // Unauthenticated
  if (!user) {
    return <>{unauthenticated ?? null}</>;
  }

  return <>{children(user)}</>;
}
