'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ProgressCalendar from '@/components/ProgressCalendar';
import CountdownTimer from '@/components/CountdownTimer';
import StreakChip from '@/components/StreakChip';
import { StreakData } from '@/types';
import { loadStreakData } from '@/lib/streak-engine';
import { createClient } from '@/lib/supabase/client';
import type { UserStats } from '@/types/gamification';
import { getTodayUTC } from '@/lib/timezone';

export default function StreakPage() {
  const router = useRouter();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const today = getTodayUTC();

  useEffect(() => {
    async function hydrate() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        console.log('[STREAK HYDRATE] Authenticated, fetching DB streak');
        try {
          const [statsRes, streakRes] = await Promise.all([
            fetch('/api/user/stats'),
            fetch('/api/user/streak')
          ]);

          if (statsRes.ok && streakRes.ok) {
            const stats: UserStats = await statsRes.json();
            const streakInfo = await streakRes.json();
            setUserStats(stats);
            setStreak({
              currentStreak: stats.current_streak,
              bestStreak: stats.best_streak,
              lastSolvedDate: stats.last_solved_date,
              totalSolved: stats.riddles_solved,
              solvedDates: streakInfo.events.map((e: any) => ({
                date: e.solved_date,
                difficulty: 'medium', // fallback difficulty
                hintsUsed: 0
              })),
              progressState: stats.last_solved_date === today ? 'solved' : 'unsolved',
              solvedDifficulty: null,
            });
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('[STREAK HYDRATE] API error', e);
        }
      }

      setStreak(loadStreakData());
      setLoading(false);
    }
    hydrate();
  }, [today]);

  if (loading || !streak) return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />;

  const isSolved = streak.progressState === 'solved';
  const pct = streak.bestStreak > 0
    ? Math.min(100, Math.round((streak.currentStreak / streak.bestStreak) * 100))
    : 0;

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Nav ─────────────────────────────────── */}
      <nav style={{
        width: '100%', maxWidth: 860,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 0 0',
      }}>
        <button className="nav-back" onClick={() => router.push('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--text-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--bg)', fontSize: 13, fontWeight: 800,
            fontFamily: "'Bricolage Grotesque', sans-serif",
          }}>∑</div>
          <span className="font-display" style={{ fontSize: 15, fontWeight: 700 }}>AdvaitAI</span>
        </div>
        {streak && <StreakChip current={streak.currentStreak} />}
      </nav>

      {/* ── Content ──────────────────────────────── */}
      <main style={{ width: '100%', maxWidth: 860, padding: 'clamp(48px, 8vh, 96px) 0 80px', display: 'flex', flexDirection: 'column', gap: 64 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}
        >
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, marginBottom: 10 }}>
              Your progress
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-3)', lineHeight: 1.6 }}>
              Tracking your daily intelligence ritual.
            </p>
          </div>
          {!isSolved && (
            <button className="btn btn-primary" onClick={() => router.push('/')} style={{ fontSize: 14 }}>
              Today's ritual →
            </button>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Today's status */}
          <div style={{
            padding: '24px 28px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 48,
            flexWrap: 'wrap', gap: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {isSolved ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-9" stroke="var(--text-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="var(--text-3)" strokeWidth="1.8"/>
                    <path d="M12 7v5l3 3" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>
                  {isSolved ? "Today's ritual complete" : "Today's ritual pending"}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  {isSolved
                    ? `Solved on ${streak.solvedDifficulty} difficulty`
                    : "You haven't solved today's challenge yet."}
                </div>
              </div>
            </div>
            {isSolved ? <CountdownTimer /> : (
              <button className="btn btn-primary" style={{ fontSize: 13, padding: '11px 20px' }} onClick={() => router.push('/')}>
                Solve now →
              </button>
            )}
          </div>

          {/* Stat numbers grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(20px, 4vw, 48px)', marginBottom: 48 }}>
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>Current streak</span>
              <span className="stat-num">{streak.currentStreak}</span>
            </div>
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>Best streak</span>
              <span className="stat-num muted">{streak.bestStreak}</span>
            </div>
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>{userStats ? 'Total XP' : 'Total solved'}</span>
              <span className="stat-num muted">{userStats ? userStats.total_xp : streak.totalSolved}</span>
            </div>
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>{userStats ? 'Accuracy' : 'To best'}</span>
              <span className="stat-num muted">
                {userStats 
                  ? (userStats.total_attempts > 0 ? `${Math.round((userStats.correct_attempts / userStats.total_attempts) * 100)}%` : '—')
                  : (streak.bestStreak > 0 ? `${pct}%` : '—')}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {streak.bestStreak > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="label">Streak progress</span>
                <span className="label mono" style={{ color: 'var(--text-2)' }}>
                  {streak.currentStreak} / {streak.bestStreak} days
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              {streak.currentStreak >= streak.bestStreak && streak.bestStreak > 0 && (
                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-2)' }}>
                  Matching your personal best.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 48 }}
        >
          <div style={{ marginBottom: 24 }}>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              The last 30 days
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>
              Consistency is the foundation of mastery.
            </p>
          </div>
          <ProgressCalendar solvedDates={streak.solvedDates} />
        </motion.div>

      </main>
    </div>
  );
}
