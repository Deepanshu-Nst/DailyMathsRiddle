'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProgressCalendar from '@/components/ProgressCalendar';
import CountdownTimer from '@/components/CountdownTimer';
import type { UserStats } from '@/types/gamification';
import { Container, PageHeader } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { GlowOrb } from '@/components/ui/GlowOrb';
import { staggerContainer, fadeUp, heroReveal, slideUp, viewReveal, spring } from '@/lib/motion';
import { Flame, Target, Clock, CheckCircle2, ArrowRight } from 'lucide-react';

export default function StreakContent({
  userStats,
  solvedDates,
  todayIST,
}: {
  userStats: UserStats | null;
  solvedDates: string[];
  todayIST: string;
}) {
  const router = useRouter();
  const today = todayIST;

  const currentStreak = userStats?.current_streak ?? 0;
  const bestStreak = userStats?.best_streak ?? 0;
  const totalSolved = userStats?.riddles_solved ?? 0;
  const isSolved = String(userStats?.last_solved_date ?? '').slice(0, 10) === today;
  const pct = bestStreak > 0
    ? Math.min(100, Math.round((currentStreak / bestStreak) * 100))
    : 0;

  const accuracy = userStats 
    ? (userStats.total_attempts > 0 ? Math.round((userStats.correct_attempts / userStats.total_attempts) * 100) : null)
    : null;

  return (
    <Container wide className="pt-12 pb-24 lg:pt-16 lg:pb-32 relative overflow-hidden">
      <GlowOrb color="rgba(108, 123, 255, 1)" size={600} position="top-center" intensity={0.08} />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-[860px] mx-auto flex flex-col gap-12 lg:gap-16"
      >
        {/* Header */}
        <motion.div variants={heroReveal} className="flex items-end justify-between flex-wrap gap-6">
          <PageHeader
            eyebrow="Intelligence ritual"
            title="Your progress"
            description="Tracking your daily intelligence ritual. Consistency is the foundation of mastery."
          />
          {!isSolved && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={spring}>
              <Button variant="primary" onClick={() => router.push('/')} className="gap-2">
                Today&apos;s ritual
                <ArrowRight size={14} />
              </Button>
            </motion.div>
          )}
        </motion.div>

        {/* Today Status Card */}
        <motion.div variants={fadeUp}>
          <Card variant="interactive" padding="lg" className="flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                isSolved 
                  ? 'border-success/30 bg-success/10 text-success' 
                  : 'border-white/[0.08] bg-white/[0.04] text-text-3'
              }`}>
                {isSolved ? <CheckCircle2 size={20} /> : <Clock size={20} />}
              </div>
              <div>
                <p className="text-[15px] font-semibold text-text-1">
                  {isSolved ? "Today's ritual complete" : "Today's ritual pending"}
                </p>
                <p className="text-[13px] text-text-3 mt-0.5">
                  {isSolved ? 'Solved today' : "You haven't solved today's challenge yet."}
                </p>
              </div>
            </div>
            {isSolved ? <CountdownTimer /> : (
              <Button variant="primary" size="sm" onClick={() => router.push('/')} className="gap-2">
                Solve now
                <ArrowRight size={14} />
              </Button>
            )}
          </Card>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card variant="metric" padding="md" className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-primary" />
                <span className="label text-text-4">Current streak</span>
              </div>
              <AnimatedNumber value={currentStreak} className="font-display text-[clamp(28px,4vw,38px)] tabular-nums text-text-1" />
              <span className="text-[10px] text-text-3 font-mono">days</span>
            </Card>
            <Card variant="metric" padding="md" className="flex flex-col gap-2">
              <span className="label text-text-4">Best streak</span>
              <AnimatedNumber value={bestStreak} className="font-display text-[clamp(28px,4vw,38px)] tabular-nums text-text-2" />
              <span className="text-[10px] text-text-3 font-mono">days</span>
            </Card>
            <Card variant="metric" padding="md" className="flex flex-col gap-2">
              <span className="label text-text-4">Total XP</span>
              <AnimatedNumber value={userStats?.total_xp ?? 0} className="font-display text-[clamp(28px,4vw,38px)] tabular-nums text-text-2" />
            </Card>
            <Card variant="metric" padding="md" className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-text-3" />
                <span className="label text-text-4">Accuracy</span>
              </div>
              <span className="font-display text-[clamp(28px,4vw,38px)] tabular-nums text-text-2">
                {accuracy !== null ? `${accuracy}%` : '—'}
              </span>
            </Card>
          </div>
        </motion.div>

        {/* Streak Progress Bar */}
        {bestStreak > 0 && (
          <motion.div variants={fadeUp}>
            <Card padding="lg" className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="label text-text-4">Streak progress</span>
                <span className="font-mono text-[12px] text-text-2">
                  {currentStreak} / {bestStreak} days
                </span>
              </div>
              <div className="progress-track">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                />
              </div>
              {currentStreak >= bestStreak && bestStreak > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="glow" size="sm" dot>Matching personal best</Badge>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Activity Calendar */}
        <motion.div
          {...viewReveal}
          variants={slideUp}
          className="flex flex-col gap-6"
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div>
            <h2 className="font-display text-[22px] tracking-tight text-text-1 mb-2">
              The last 30 days
            </h2>
            <p className="text-[14px] text-text-3">
              Consistency is the foundation of mastery.
            </p>
          </div>
          <Card padding="lg" variant="glass">
            <ProgressCalendar solvedDates={solvedDates.map(date => ({ date, difficulty: 'medium' as const, hintsUsed: 0 }))} todayIST={todayIST} />
          </Card>
        </motion.div>
      </motion.div>
    </Container>
  );
}
