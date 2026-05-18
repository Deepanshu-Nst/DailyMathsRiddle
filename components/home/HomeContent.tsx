'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CountdownTimer from '@/components/CountdownTimer';
import ProgressCalendar from '@/components/ProgressCalendar';
import { Difficulty } from '@/types';
import { getOfficialDailyDate, OFFICIAL_DAILY_TZ } from '@/lib/timezone';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, spring } from '@/lib/motion';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';

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
    <Container wide className="pt-10 pb-20 lg:pt-14 lg:pb-28">
      <motion.main
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:gap-16 lg:items-start"
      >
        <div className="flex flex-col gap-10 lg:gap-12">
          <motion.div variants={fadeUp} className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[11px] font-medium text-text-3">{formattedDate}</span>
              <span className="hidden h-px w-10 bg-border-dark sm:block" />
              <Badge variant="secondary" size="sm" className="font-mono">
                Daily · {OFFICIAL_DAILY_TZ === 'Asia/Kolkata' ? 'IST' : OFFICIAL_DAILY_TZ}
              </Badge>
            </div>

            <h1 className="max-w-xl font-display text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.08] tracking-tight text-text-1">
              Today&apos;s challenge
            </h1>

            <p className="max-w-lg text-[15px] leading-relaxed text-text-2">
              Your progress syncs automatically. Pick a difficulty and solve today&apos;s puzzle.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} transition={{ type: 'spring', damping: 28, stiffness: 260 }}>
            <div className="content-panel relative px-6 py-8 sm:px-8 sm:py-9">
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
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-success/30 bg-success/10 text-success"
                        >
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                        <div>
                          <p className="font-mono text-[10px] font-medium text-text-3">Solved for today</p>
                          <h3 className="mt-2 font-display text-2xl text-text-1 sm:text-[1.65rem]">
                            You&apos;re done for this daily.
                          </h3>
                          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-2">
                            Come back after the next reset, or open today&apos;s puzzle to review the explanation.
                            Extra generated puzzles do not change your daily completion.
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
                          onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                          className="border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                        >
                          Open today&apos;s puzzle
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
                        />
                      </div>

                      <div className="flex flex-col gap-4 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-1">Today&apos;s puzzle</p>
                          <p className="mt-1 font-mono text-[11px] text-text-3">
                            One completion per daily calendar · midnight {OFFICIAL_DAILY_TZ === 'Asia/Kolkata' ? 'IST' : OFFICIAL_DAILY_TZ}
                          </p>
                        </div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={spring}>
                          <Button
                            size="lg"
                            onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                            className="gap-2 px-8"
                          >
                            Continue
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="5" y1="12" x2="19" y2="12" />
                              <polyline points="12 5 19 12 12 19" />
                            </svg>
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
        </div>

          <motion.aside variants={fadeUp} className="flex flex-col gap-8 lg:sticky lg:top-24">
            <div className="glass-panel p-6 sm:p-7">
              <p className="label mb-6 text-text-4">Overview</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1 border-l-2 border-primary/40 pl-4">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3">
                    Streak
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tabular-nums text-text-1">{currentStreak}</span>
                    <span className="text-xs font-medium text-text-3">d</span>
                  </div>
                </div>
                <div className="space-y-1 border-l border-white/[0.08] pl-4">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-3">
                    Total XP
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-4xl tabular-nums text-text-1">{totalXp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <span className="label text-text-4">Activity</span>
                <span className="font-mono text-[10px] text-text-4">30d</span>
              </div>
              <ProgressCalendar solvedDates={activityMap} todayIST={getOfficialDailyDate()} />
            </div>

            <motion.div whileHover={{ y: -2 }} transition={spring}>
              <Link
                href="/leaderboard"
                className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 transition-colors hover:border-primary/25 hover:bg-white/[0.05]"
              >
                <div>
                  <p className="text-sm font-semibold text-text-1">Global rankings</p>
                  <p className="mt-0.5 text-xs text-text-3">All-time XP ranking</p>
                </div>
                <span className="text-lg text-text-4 transition-transform group-hover:translate-x-0.5 group-hover:text-primary">
                  →
                </span>
              </Link>
            </motion.div>
            </motion.aside>
      </motion.main>

      <footer className="mt-24 flex flex-col gap-4 border-t border-white/[0.06] pt-8 text-sm text-text-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] tracking-wide">© 2026 AdvaitAI</p>
        <div className="flex flex-wrap gap-6 font-medium">
          <a href="#" className="transition-colors hover:text-text-1">
            Docs
          </a>
          <a href="#" className="transition-colors hover:text-text-1">
            Privacy
          </a>
        </div>
      </footer>
    </Container>
  );
}
