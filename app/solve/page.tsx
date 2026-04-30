'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import AnswerInput from '@/components/AnswerInput';
import HintLadder from '@/components/HintLadder';
import CelebrationModal from '@/components/CelebrationModal';
import StreakChip from '@/components/StreakChip';
import CountdownTimer from '@/components/CountdownTimer';
import { Difficulty, StreakData } from '@/types';
import { markSolved, loadStreakData } from '@/lib/streak-engine';
import { getTodayUTC } from '@/lib/timezone';

interface RiddleData {
  id: string; question: string; hint1: string; hint2: string; category: string; difficulty: string;
}

function SolvePage() {
  const router = useRouter();
  const params = useSearchParams();
  const dateParam = params.get('date') ?? getTodayUTC();
  const difficulty = (params.get('difficulty') as Difficulty) ?? 'medium';

  const [riddle, setRiddle] = useState<RiddleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle'|'correct'|'incorrect'>('idle');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [isSolved, setIsSolved] = useState(false);

  const fetchRiddle = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/challenge?difficulty=${difficulty}&date=${dateParam}`);
      const data = await res.json();
      setRiddle(data.riddle);
    } catch {
      setError('Failed to load riddle. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, dateParam]);

  useEffect(() => {
    const s = loadStreakData();
    setStreak(s);
    if (s.progressState === 'solved') { setIsSolved(true); setStatus('correct'); }
    fetchRiddle();
  }, [fetchRiddle]);

  const handleSubmit = async () => {
    if (!answer.trim() || status === 'correct') return;
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAnswer: answer, difficulty, date: dateParam }),
      });
      const data = await res.json();
      if (data.isCorrect) {
        setStatus('correct');
        setExplanation(data.explanation ?? '');
        setCorrectAnswer(data.answer ?? '');
        const updated = markSolved(dateParam, difficulty, hintsUsed);
        setStreak(updated);
        setIsSolved(true);
        setTimeout(() => setShowModal(true), 400);
      } else {
        setStatus('incorrect');
        setTimeout(() => setStatus('idle'), 2000);
      }
    } catch {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* ── Nav ─────────────────────────────────── */}
      <nav style={{
        width: '100%', maxWidth: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '28px 0 0',
      }}>
        <button className="nav-back" onClick={() => router.push('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </button>
        {streak && <StreakChip current={streak.currentStreak} />}
      </nav>

      {/* ── Two-column ──────────────────────────── */}
      <main style={{
        width: '100%', maxWidth: 1100,
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.6fr)',
        gap: 'clamp(40px, 6vw, 96px)',
        alignItems: 'start',
        padding: 'clamp(48px, 8vh, 96px) 0 80px',
      }}>

        {/* LEFT: The Ritual */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'flex', flexDirection: 'column', gap: 36 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="label">Today's ritual</span>
            {riddle && (
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-3)',
                padding: '5px 10px', border: '1px solid var(--border)',
                borderRadius: 5, background: 'var(--surface)',
              }}>
                {difficulty}
              </span>
            )}
          </div>

          {/* Question — the hero element */}
          <div style={{
            position: 'relative',
            padding: '36px 0 36px',
            /* spotlight effect behind the question text */
          }}>
            {/* Radial spotlight */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 500, height: 300,
              transform: 'translate(-50%, -50%)',
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.032) 0%, transparent 70%)',
              pointerEvents: 'none', zIndex: 0,
            }} />

            {loading ? (
              <div style={{ color: 'var(--text-3)', fontSize: 17 }}>Preparing your ritual…</div>
            ) : error ? (
              <div style={{ color: 'var(--error)', fontSize: 17 }}>{error}</div>
            ) : riddle ? (
              <p style={{
                position: 'relative', zIndex: 1,
                fontSize: 'clamp(20px, 2.8vw, 28px)',
                fontWeight: 500,
                color: 'var(--text-1)',
                lineHeight: 1.65,
                letterSpacing: '-0.01em',
              }}>
                {riddle.question}
              </p>
            ) : null}
          </div>

          {/* Answer / solved */}
          {!loading && !error && riddle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 500 }}>
              {!isSolved ? (
                <>
                  <AnswerInput
                    value={answer}
                    onChange={setAnswer}
                    onSubmit={handleSubmit}
                    status={status}
                    disabled={status === 'correct'}
                  />
                  <HintLadder
                    hint1={riddle.hint1}
                    hint2={riddle.hint2}
                    disabled={status === 'correct'}
                  />
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                    <span style={{ fontSize: 14, color: 'var(--success)' }}>Solved</span>
                  </div>
                  {correctAnswer && (
                    <div>
                      <span className="label" style={{ display: 'block', marginBottom: 8 }}>Your answer</span>
                      <span className="mono" style={{ fontSize: 22, fontWeight: 500, color: 'var(--text-1)' }}>
                        {correctAnswer}
                      </span>
                    </div>
                  )}
                  {explanation && (
                    <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{explanation}</p>
                  )}
                  <button className="btn btn-ghost" onClick={() => setShowModal(true)} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                    View solution details
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* RIGHT: Context */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 40, paddingTop: 0 }}
        >
          {riddle && (
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>Category</span>
              <span style={{ fontSize: 15, color: 'var(--text-2)' }}>{riddle.category}</span>
            </div>
          )}

          {streak && (
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 10 }}>Current streak</span>
              <span className="stat-num" style={{ fontSize: 40 }}>{streak.currentStreak}</span>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 32 }}>
            <CountdownTimer />
          </div>

          {!isSolved && (
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 28 }}>
              <p style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.7 }}>
                Come back tomorrow for a new challenge. Build the habit — one ritual at a time.
              </p>
            </div>
          )}
        </motion.div>

      </main>

      {/* Celebration modal */}
      <AnimatePresence>
        {showModal && riddle && (
          <CelebrationModal
            explanation={explanation}
            answer={correctAnswer}
            streak={streak?.currentStreak ?? 0}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SolvePageWrapper() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <SolvePage />
    </Suspense>
  );
}
