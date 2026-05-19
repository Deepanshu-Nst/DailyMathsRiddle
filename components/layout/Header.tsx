'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import StreakChip from '@/components/StreakChip';
import { createClient } from '@/utils/supabase/client';
import UsernameModal from '@/components/profile/UsernameModal';
import type { Database } from '@/types/supabase';
import type { User } from '@supabase/supabase-js';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';
import { Topbar, Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLinks = [
    { href: '/leaderboard', label: 'Leaderboard' },
    { href: '/streak', label: 'Progress' },
  ];

  return (
    <>
      <Topbar>
        <Container className="flex items-center justify-between w-full">
          {/* Brand & Nav */}
          <div className="flex items-center gap-8 lg:gap-10">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => router.push('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_24px_rgba(108,123,255,0.5)] group-hover:rotate-[-3deg]">
                ∑
              </div>
              <span className="font-display text-xl tracking-tight text-text-1">
                AdvaitAI
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className="relative px-3.5 py-2 text-[13px] font-medium text-text-2 rounded-lg hover:text-text-1 hover:bg-white/[0.04] transition-all group"
                >
                  {link.label}
                  <span className="absolute bottom-0.5 left-3.5 right-3.5 h-[2px] origin-left scale-x-0 bg-primary rounded-full transition-transform duration-300 group-hover:scale-x-100" />
                </Link>
              ))}
            </nav>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-4 sm:gap-5">
            {displayStreak > 0 && <StreakChip current={displayStreak} />}

            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <div 
                  className="flex items-center gap-2.5 cursor-pointer group"
                  onClick={() => profile?.username && router.push(`/u/${profile.username}`)}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full border border-white/[0.08] group-hover:ring-2 group-hover:ring-primary/40 group-hover:border-primary/50 transition-all duration-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-surface-soft border border-white/[0.08] group-hover:ring-2 group-hover:ring-primary/40 group-hover:border-primary/50 transition-all duration-200 flex items-center justify-center text-text-3 text-xs font-bold">
                      {(profile?.username || profile?.full_name || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-[13px] font-medium text-text-2 group-hover:text-text-1 transition-colors">
                    {profile?.username || profile?.full_name?.split(' ')[0] || 'User'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="text-text-3"
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <Button 
                variant="primary"
                size="sm"
                onClick={handleSignIn} 
                disabled={isSigningIn}
                className="hidden sm:inline-flex"
              >
                {isSigningIn ? 'Redirecting…' : 'Sign in'}
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-text-2 hover:text-text-1 hover:bg-white/[0.06] transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </Container>
      </Topbar>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 bg-black/60 backdrop-blur-md md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-16 left-0 right-0 z-30 border-b border-white/[0.06] bg-[rgba(8,8,12,0.97)] backdrop-blur-2xl md:hidden"
            >
              <Container className="py-4 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-[15px] font-medium text-text-2 hover:text-text-1 hover:bg-white/[0.04] rounded-xl transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-2 pt-3 border-t border-white/[0.06] flex flex-col gap-2">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-2">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full border border-white/[0.08]" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-surface-soft border border-white/[0.08] flex items-center justify-center text-text-3 text-xs font-bold">
                            {(profile?.username || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-medium text-text-1">
                          {profile?.username || profile?.full_name?.split(' ')[0] || 'User'}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleSignOut} fullWidth className="justify-start">
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <Button variant="primary" size="md" onClick={handleSignIn} disabled={isSigningIn} fullWidth>
                      {isSigningIn ? 'Redirecting…' : 'Sign in with Google'}
                    </Button>
                  )}
                </div>
              </Container>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
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
