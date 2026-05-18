'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StreakChip from '@/components/StreakChip';
import { createClient } from '@/utils/supabase/client';
import UsernameModal from '@/components/profile/UsernameModal';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';
import { Topbar, Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface HeaderProps {
  user: User | null;
  profile: Profile | null;
}

export default function Header({ user, profile }: HeaderProps) {
  const router = useRouter();
  const { session } = useChallengeSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(!!user && !profile?.username);

  const displayStreak = session?.streak?.currentStreak ?? profile?.streak_count ?? 0;

  async function handleSignIn() {
    setIsSigningIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      console.error('[OAUTH ERROR]', error.message);
      setIsSigningIn(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <>
      <Topbar>
        <Container className="flex items-center justify-between w-full">
          {/* Brand & Nav */}
          <div className="flex items-center gap-10">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => router.push('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(108,123,255,0.4)]">
                ∑
              </div>
              <span className="font-display text-xl tracking-tight text-text-1">
                AdvaitAI
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <Link 
                href="/leaderboard" 
                className="relative text-[13px] font-semibold text-text-2 hover:text-text-1 transition-colors after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-primary after:transition-transform hover:after:scale-x-100"
              >
                Leaderboard
              </Link>
            </nav>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-6">
            {displayStreak > 0 && <StreakChip current={displayStreak} />}

            {user ? (
              <div className="flex items-center gap-4">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => profile?.username && router.push(`/u/${profile.username}`)}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-border group-hover:ring-2 group-hover:ring-primary/50 group-hover:border-primary transition-all"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-bg-subtle border border-border group-hover:ring-2 group-hover:ring-primary/50 group-hover:border-primary transition-all" />
                  )}
                  <span className="text-[13px] font-semibold text-text-2 group-hover:text-text-1 transition-colors">
                    {profile?.username || profile?.full_name?.split(' ')[0] || 'User'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button 
                variant="primary"
                onClick={handleSignIn} 
                disabled={isSigningIn}
              >
                {isSigningIn ? 'Redirecting…' : 'Sign in'}
              </Button>
            )}
          </div>
        </Container>
      </Topbar>
      
      <UsernameModal 
        isOpen={showUsernameModal} 
        onSuccess={() => {
          setShowUsernameModal(false);
          router.refresh();
        }}
      />
    </>
  );
}
