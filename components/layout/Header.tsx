'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StreakChip from '@/components/StreakChip';
import { loadStreakData } from '@/lib/streak-engine';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface HeaderProps {
  /** Server-rendered initial profile — may be null for anonymous users. */
  profile?: Profile | null;
}

export default function Header({ profile: initialProfile }: HeaderProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null);
  const [localStreak, setLocalStreak] = useState(0);
  const [isSigningIn, setIsSigningIn] = useState(false);

  console.log('[AUTH RERENDER]', {
    hasInitial: !!initialProfile,
    hasState: !!profile,
    profileId: profile?.id?.slice(0, 8),
  });

  // ── Anonymous streak fallback ────────────────────────────────────
  useEffect(() => {
    if (!profile) {
      const data = loadStreakData();
      setLocalStreak(data.currentStreak);
    }
  }, [profile]);

  // ── Reactive auth hydration ──────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    console.log('[AUTH HYDRATED CLIENT] browser client initialized');

    // Immediately check session once on mount to compare with server state
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH SESSION FOUND]', {
        found: !!session,
        userId: session?.user?.id?.slice(0, 8),
        match: session?.user?.id === initialProfile?.id,
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH EVENT]', event, session?.user?.id?.slice(0, 8) ?? 'no-user');

        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          // If we have an initialProfile from the server, but the client says no session
          // on INITIAL_SESSION, it might be a hydration race or a cookie issue.
          // We only clear it if event is explicitly SIGNED_OUT.
          if (event === 'SIGNED_OUT') {
            console.log('[AUTH ACTION] clearing profile');
            setProfile(null);
          }
          return;
        }

        if (session?.user) {
          console.log('[AUTH USER]', session.user.id.slice(0, 8));

          // Fetch the full profile from the DB
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data) {
            const p = data as Profile;
            console.log('[USER HYDRATED] success', p.id.slice(0, 8));
            setProfile(p);
          } else {
            // Fallback to metadata if DB query fails
            const meta = session.user.user_metadata ?? {};
            console.log('[USER HYDRATED] fallback to metadata', session.user.id.slice(0, 8), error?.message);
            setProfile({
              id: session.user.id,
              email: session.user.email ?? '',
              full_name: meta.full_name ?? meta.name ?? null,
              avatar_url: meta.avatar_url ?? meta.picture ?? null,
              role: 'user',
              streak_count: 0,
              xp: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }
    );

    return () => {
      console.log('[AUTH UNMOUNT] cleaning up listener');
      subscription.unsubscribe();
    };
  }, [initialProfile?.id]); // Only re-run if the server-provided identity changes

  const displayStreak = profile ? profile.streak_count : localStreak;

  async function handleSignIn() {
    console.log('[OAUTH START CLIENT]');
    setIsSigningIn(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('[OAUTH ERROR]', error.message);
      setIsSigningIn(false);
      return;
    }
    console.log('[SUPABASE REDIRECT]', data.url);
  }

  async function handleSignOut() {
    console.log('[AUTH SIGN OUT START]');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh(); // Force server to recognize logged-out state
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0 24px' }}>
      <nav style={{
        width: '100%', maxWidth: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 0 0',
      }}>

        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 7,
            background: 'var(--text-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--bg)', fontSize: 15, fontWeight: 800,
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}>
            ∑
          </div>
          <span className="font-display" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>
            AdvaitAI
          </span>
        </div>

        {/* Right Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {displayStreak > 0 && <StreakChip current={displayStreak} />}

          {profile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)' }}
                  />
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                  }} />
                )}
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
                  {profile.full_name?.split(' ')[0] || 'You'}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="btn btn-ghost"
                style={{ fontSize: 13, padding: '6px 10px' }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="btn btn-secondary"
              style={{ fontSize: 13, padding: '8px 14px', opacity: isSigningIn ? 0.6 : 1 }}
            >
              {isSigningIn ? 'Redirecting…' : 'Sign in with Google'}
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
