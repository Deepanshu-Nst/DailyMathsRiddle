'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CountdownTimer from '@/components/CountdownTimer';
import ProgressCalendar from '@/components/ProgressCalendar';
import { Difficulty } from '@/types';
import { getOfficialDailyDate, OFFICIAL_DAILY_TZ } from '@/lib/timezone';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, spring, heroReveal } from '@/lib/motion';
import { Container, Divider } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { GlowOrb } from '@/components/ui/GlowOrb';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';
import { Trophy, ArrowRight, Calendar } from 'lucide-react';

export default function HomeContent() {
  const router = useRouter();
  const { session, loading } = useChallengeSession();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const today = getOfficialDailyDate();
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: OFFICIAL_DAILY_TZ,
  }).format(new Date());

  const isSolved = session?.solvedToday ?? false;
  const currentStreak = session?.streak.currentStreak ?? 0;
  const totalXp = session?.streak.totalXP ?? 0;
  const activityMap = session?.activityMap ?? [];

  return (
    <Container wide className="pt-16 pb-24 lg:pt-24 lg:pb-32 relative overflow-hidden">
      <GlowOrb color="rgba(108, 123, 255, 1)" size={800} position="top-center" intensity={0.1} />
      <div className="surface-grain" />

      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-16 lg:items-start"
      >
        {/* ─── Left Column ─── */}
        <div className="flex flex-col gap-10 lg:gap-12">

          {/* Hero Text */}
          <motion.div variants={heroReveal} className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" size="sm" className="font-mono">
                <Calendar size={10} className="opacity-60" />
                {formattedDate}
              </Badge>
              <span className="hidden h-px w-8 bg-white/[0.1] sm:block" />
              <Badge variant="primary" size="sm" className="font-mono" dot>
                Daily · {OFFICIAL_DAILY_TZ === 'Asia/Kolkata' ? 'IST' : OFFICIAL_DAILY_TZ}
              </Badge>
            </div>

            <h1 className="max-w-2xl text-[clamp(2.75rem,6vw,4.5rem)] font-semibold leading-[0.98] tracking-tight">
              <span className="gradient-text-hero">Today&apos;s</span>
              <br />
              <span className="text-text-1">challenge</span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-text-2">
              Your progress syncs automatically. Pick a difficulty and solve today&apos;s puzzle.
            </p>
          </motion.div>

          {/* Challenge Panel */}
          <motion.div variants={fadeUp}>
            <div className="content-panel relative px-8 py-10 sm:px-10 sm:py-12">
              <div className="relative">
                {loading ? (
                  <div className="flex flex-col gap-4">
                    <div className="skeleton-shimmer h-7 w-1/3 rounded-md" />
                    <div className="skeleton-shimmer h-4 w-2/3 rounded-md" />
                    <div className="skeleton-shimmer mt-4 h-12 w-full rounded-lg" />
                  </div>
                ) : isSolved ? (
                  <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                      <motion.div
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring}
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-success/30 bg-success/10 text-success shadow-[0_0_24px_rgba(52,211,153,0.2)]"
                      >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </motion.div>
                      <div>
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3">Solved for today</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-text-1 sm:text-[1.65rem]">
                          You&apos;re done for this daily.
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-text-2">
                          Come back after the next reset, or open today&apos;s puzzle to review the explanation.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <span className="label mb-2 block text-text-4">Next challenge in</span>
                        <CountdownTimer />
                      </div>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                        className="gap-2"
                      >
                        Open today&apos;s puzzle
                        <ArrowRight size={16} className="opacity-60" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-8">
                    <div>
                      <label className="label mb-3 block text-text-4">Difficulty</label>
                      <Tabs
                        tabs={[
                          { id: 'easy', label: 'Easy' },
                          { id: 'medium', label: 'Medium' },
                          { id: 'hard', label: 'Hard' },
                        ]}
                        activeTab={difficulty}
                        onChange={(id) => setDifficulty(id as Difficulty)}
                        variant="segmented"
                      />
                    </div>

                    <Divider />

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-text-1">Today&apos;s puzzle</p>
                        <p className="mt-1 font-mono text-[11px] text-text-3">
                          One completion per daily calendar
                        </p>
                      </div>
                      <Button
                        size="lg"
                        variant="primary"
                        onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                        className="gap-2.5 px-8"
                      >
                        Begin challenge
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Right Column ─── */}
        <motion.aside variants={fadeUp} className="flex flex-col gap-6 lg:sticky lg:top-24">

          {/* Stats Panel */}
          <div className="glass-panel p-6 sm:p-7">
            <p className="label mb-6 text-text-4">Overview</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5 border-l-2 border-primary/40 pl-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3">
                  Streak
                </span>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber value={currentStreak} className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tabular-nums gradient-text-accent" />
                  <span className="text-sm font-medium text-text-3">d</span>
                </div>
              </div>
              <div className="space-y-1.5 border-l border-white/[0.08] pl-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3">
                  Total XP
                </span>
                <div className="flex items-baseline gap-1">
                  <AnimatedNumber value={totalXp} className="text-[clamp(2rem,4vw,2.75rem)] font-semibold tabular-nums gradient-text-accent" />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Calendar */}
          <div className="glass-panel p-6 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <span className="label text-text-4">Activity</span>
              <Badge variant="secondary" size="sm" className="font-mono">30d</Badge>
            </div>
            <ProgressCalendar solvedDates={activityMap} todayIST={getOfficialDailyDate()} />
          </div>

          {/* Leaderboard Link */}
          <Link
            href="/leaderboard"
            className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition-standard hover:border-primary/25 hover:bg-white/[0.05]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Trophy size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-1">Global rankings</p>
                <p className="mt-0.5 text-xs text-text-3">All-time XP ranking</p>
              </div>
            </div>
            <span className="text-lg text-text-4 transition-all group-hover:translate-x-1 group-hover:text-primary">
              →
            </span>
          </Link>
        </motion.aside>
      </motion.main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-24 relative"
      >
        <Divider className="mb-8" />
        <div className="flex flex-col gap-4 text-sm text-text-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[11px] tracking-wide">© 2026 AdvaitAI</p>
          <div className="flex flex-wrap gap-6 font-medium">
            <a href="#" className="transition-color hover:text-text-1 text-text-3">
              Docs
            </a>
            <a href="#" className="transition-color hover:text-text-1 text-text-3">
              Privacy
            </a>
          </div>
        </div>
      </motion.footer>
    </Container>
  );
}
