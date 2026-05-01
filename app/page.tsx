'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DifficultySelector from '@/components/DifficultySelector';
import StreakChip from '@/components/StreakChip';
import CountdownTimer from '@/components/CountdownTimer';
import ProgressCalendar from '@/components/ProgressCalendar';
import { Difficulty, StreakData } from '@/types';
import { loadStreakData } from '@/lib/streak-engine';
import { getTodayUTC } from '@/lib/timezone';
import { motion } from 'framer-motion';

const APPEAR = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
};

export default function HomePage() {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [streak, setStreak] = useState<StreakData | null>(null);

  const today = getTodayUTC();
  const formattedDate = new Date(today + 'T00:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC',
  });

  useEffect(() => {
    const data = loadStreakData();
    setStreak(data);
    if (data.solvedDifficulty) setDifficulty(data.solvedDifficulty);
  }, []);

  const isSolved = streak?.progressState === 'solved';
  const pct = streak && streak.bestStreak > 0
    ? Math.min(100, Math.round((streak.currentStreak / streak.bestStreak) * 100))
    : 0;

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Nav ─────────────────────────────────────── */}
      <nav style={{
        width: '100%', maxWidth: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 0 0',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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

        {/* Streak + progress link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {streak && <StreakChip current={streak.currentStreak} />}
          <button
            className="btn btn-ghost"
            onClick={() => router.push('/streak')}
            style={{ fontSize: 13 }}
          >
            Progress →
          </button>
        </div>
      </nav>

      {/* ── Two-column layout ────────────────────── */}
      <main style={{
        width: '100%', maxWidth: 1100,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,0.8fr)',
        gap: 'clamp(40px, 6vw, 96px)',
        alignItems: 'start',
        padding: 'clamp(48px, 8vh, 96px) 0 80px',
      }}>

        {/* ── LEFT: Hero + Challenge ─────────────── */}
        <motion.div {...APPEAR} style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* Date badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-1)' }} />
            <span className="label">{formattedDate}</span>
          </div>

          {/* Headline */}
          <div>
            <h1 className="font-display" style={{
              fontSize: 'clamp(38px, 5.5vw, 64px)',
              fontWeight: 800,
              color: 'var(--text-1)',
              marginBottom: 16,
            }}>
              Your daily<br />
              <span style={{ color: 'var(--text-2)' }}>intelligence ritual.</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 440 }}>
              One curated math challenge every day. Build your streak.<br />Come back tomorrow.
            </p>
          </div>

          {/* Challenge card / Solved state */}
          {isSolved ? (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '32px 36px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12l5 5 9-9" stroke="var(--text-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <div className="font-display" style={{ fontSize: 18, fontWeight: 700 }}>Ritual complete.</div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
                    Solved on <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{streak?.solvedDifficulty}</span> difficulty
                  </div>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
                <CountdownTimer />
              </div>
            </div>
          ) : (
            <div>
              {/* Difficulty */}
              <div style={{ marginBottom: 24 }}>
                <span className="label" style={{ display: 'block', marginBottom: 10 }}>Select difficulty</span>
                <DifficultySelector selected={difficulty} onChange={setDifficulty} />
              </div>

              {/* CTA */}
              <button
                className="btn btn-primary"
                onClick={() => router.push(`/riddle/${today}?difficulty=${difficulty}`)}
                style={{ fontSize: 15, padding: '14px 28px' }}
              >
                Begin ritual
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          )}
        </motion.div>

        {/* ── RIGHT: Stats + Calendar ────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingTop: 8 }}
        >
          {streak && (
            <>
              {/* Stat pair */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <span className="label" style={{ display: 'block', marginBottom: 8 }}>Current streak</span>
                  <span className="stat-num">{streak.currentStreak}</span>
                </div>
                <div>
                  <span className="label" style={{ display: 'block', marginBottom: 8 }}>Best streak</span>
                  <span className="stat-num muted">{streak.bestStreak}</span>
                </div>
              </div>

              {/* Progress bar */}
              {streak.bestStreak > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span className="label">Progress to best</span>
                    <span className="label mono" style={{ color: 'var(--text-2)' }}>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  {streak.currentStreak >= streak.bestStreak && streak.bestStreak > 0 && (
                    <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>
                      Matching your personal best.
                    </p>
                  )}
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

              {/* Calendar */}
              <div>
                <span className="label" style={{ display: 'block', marginBottom: 16 }}>Last 30 days</span>
                <ProgressCalendar solvedDates={streak.solvedDates} />
              </div>
            </>
          )}
        </motion.div>

      </main>

      {/* Footer */}
      <footer style={{ paddingBottom: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-4)' }}>Built by <span style={{ color: 'var(--text-3)' }}>AdvaitAI</span> · One challenge a day</span>
      </footer>
    </div>
  );
}
