'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CountdownTimer from '@/components/CountdownTimer';
import ProgressCalendar from '@/components/ProgressCalendar';
import { Difficulty } from '@/types';
import { getTodayUTC } from '@/lib/timezone';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, hoverLift, hoverScale } from '@/lib/motion';
import type { UserStats } from '@/types/gamification';
import { Container, Section } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';

export default function HomeContent() {
  const router = useRouter();
  const { session, loading } = useChallengeSession();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const today = getTodayUTC();
  const formattedDate = new Date(today + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  const isSolved = session?.solvedToday ?? false;
  const currentStreak = session?.streak.currentStreak ?? 0;
  const totalXp = session?.streak.totalXP ?? 0;
  const activityMap = session?.activityMap ?? [];

  return (
    <Container className="pt-16 pb-24">
      <main className="grid lg:grid-cols-[1.2fr,0.8fr] gap-16 items-start">
        
        {/* Left: Hero & Problem Selection */}
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="primary">{formattedDate}</Badge>
              <div className="h-px flex-1 bg-border" />
            </div>
            
            <h1 className="font-display text-4xl lg:text-5xl text-text-1 leading-[1.1]">
              Master one math challenge <span className="text-primary">every day.</span>
            </h1>
            
            <p className="text-[15px] text-text-2 max-w-lg leading-relaxed">
              AdvaitAI is a daily intelligence ritual for developers and curious minds. 
              Build your streak, climb the leaderboard, and sharpen your reasoning skills.
            </p>
          </div>

          <div>
          <div className="max-w-xl p-8 lg:p-10 bg-white border border-border-subtle rounded-3xl shadow-sm">
              {loading ? (
                <div className="flex flex-col gap-4">
                   <div className="skeleton-shimmer h-8 w-1/3 rounded"></div>
                   <div className="skeleton-shimmer h-4 w-2/3 rounded"></div>
                   <div className="skeleton-shimmer h-12 w-full rounded mt-4"></div>
                </div>
              ) : isSolved ? (
                <div className="flex flex-col gap-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center text-success shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[17px] font-semibold text-text-1 tracking-tight">Today's challenge completed</h3>
                      <p className="text-[13px] text-text-3 mt-1 leading-relaxed">Come back tomorrow for your next ritual. Meanwhile, you can review the solution or generate extra practice problems.</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-border flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Next Ritual In</span>
                      <CountdownTimer />
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                    >
                      View Solution
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  <div>
                    <label className="label mb-3 block">Select Difficulty</label>
                    <Tabs 
                      tabs={[
                        { id: 'easy', label: 'Easy' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'hard', label: 'Hard' }
                      ]}
                      activeTab={difficulty}
                      onChange={(id) => setDifficulty(id as Difficulty)}
                    />
                  </div>

                  <div className="pt-6 border-t border-border flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-semibold text-text-1">Ready to begin?</span>
                      <span className="text-[12px] text-text-3">Resets at 00:00 UTC</span>
                    </div>
                    <Button 
                      size="lg"
                      onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                      className="gap-2 px-6"
                    >
                      Begin Challenge
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Stats & Progress */}
        <div className="flex flex-col gap-10">
          {/* Progress Section */}
          <div className="flex flex-col gap-5">
            <span className="text-[11px] font-semibold tracking-widest text-text-3 uppercase">Your Progress</span>
            <div className="grid grid-cols-2 gap-8">
              <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-primary/20">
                <span className="text-[12px] font-semibold text-text-2 uppercase tracking-wider">Streak</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-display text-text-1 tracking-tight">{currentStreak}</span>
                  <span className="text-[13px] text-text-3 font-medium">days</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 pl-4 border-l-2 border-border-subtle">
                <span className="text-[12px] font-semibold text-text-2 uppercase tracking-wider">Total XP</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-display text-text-1 tracking-tight">{totalXp.toLocaleString()}</span>
                  <span className="text-[13px] text-text-3 font-medium">pts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-border-subtle" />

          {/* Activity Section */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest text-text-3 uppercase">Activity Map</span>
              <span className="text-[11px] font-medium text-text-4">Last 30 Days</span>
            </div>
            <div className="p-5 bg-white border border-border-subtle rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <ProgressCalendar solvedDates={activityMap} />
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3 mt-4">
            <Link href="/leaderboard" className="group flex items-center justify-between p-4 bg-bg-muted/50 rounded-xl hover:bg-bg-muted transition-colors">
              <span className="text-[13px] font-semibold text-text-1">Global Rankings</span>
              <span className="text-text-4 group-hover:text-primary transition-colors">→</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-28 pt-8 border-t border-border flex items-center justify-between text-[13px] text-text-3 font-medium">
        <p>© 2026 AdvaitAI · Intelligent Reasoning Engine</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-text-1 transition-colors">Documentation</a>
          <a href="#" className="hover:text-text-1 transition-colors">Privacy</a>
          <a href="#" className="hover:text-text-1 transition-colors">Twitter</a>
        </div>
      </footer>
    </Container>
  );
}
