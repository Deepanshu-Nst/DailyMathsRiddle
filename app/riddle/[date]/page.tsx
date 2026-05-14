'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import AnswerInput from '@/components/AnswerInput';
import HintLadder from '@/components/HintLadder';
import CelebrationModal from '@/components/CelebrationModal';
import ShareModal from '@/components/share/ShareModal';
import CountdownTimer from '@/components/CountdownTimer';
import GenerateMore from '@/components/riddle/GenerateMore';
import { ChallengeModal } from '@/components/riddles/ChallengeModal';
import { Difficulty, Riddle, ChallengeState } from '@/types';
import { getOfficialDailyDate } from '@/lib/timezone';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Feedback';
import { ChevronLeft, Share2, Flag, Clock, Target, Hash, Sparkles, Trophy } from 'lucide-react';
import { fadeUp, spring } from '@/lib/motion';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';

function activityCellClass(difficulty: Difficulty) {
  if (difficulty === 'easy') return 'bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.35)]';
  if (difficulty === 'hard') return 'bg-rose-400/90 shadow-[0_0_12px_rgba(251,113,133,0.35)]';
  return 'bg-primary/90 shadow-[0_0_14px_rgba(244,162,58,0.4)]';
}

function SolvePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { date } = useParams<{ date: string }>();
  const dateParam = date ?? getOfficialDailyDate();
  const difficulty = (searchParams.get('difficulty') as Difficulty) ?? 'medium';

  const { session, refreshSession } = useChallengeSession();

  const [riddle, setRiddle] = useState<Partial<Riddle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');

  const [challengeState, setChallengeState] = useState<ChallengeState>('AVAILABLE');

  const [hintsUsed, setHintsUsed] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [explanation, setExplanation] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [mode, setMode] = useState<'daily' | 'extra'>('daily');
  const [extraCount, setExtraCount] = useState(0);

  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [newStreak, setNewStreak] = useState<number | null>(null);
  const [bonuses, setBonuses] = useState<Array<{ reason: string; amount: number }>>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const solveStartedAt = useRef<string | null>(null);

  const [rank, setRank] = useState<number | null>(null);
  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [isGivingUp, setIsGivingUp] = useState(false);

  const fetchRiddle = useCallback(async () => {
    setLoading(true);
    setError('');
    setHintsUsed(0);
    try {
      const res = await fetch(`/api/challenge?difficulty=${difficulty}&date=${dateParam}`);
      const data = await res.json();
      setRiddle(data.riddle);

      if (data.isSolved) {
        setChallengeState('SOLVED');
        setCorrectAnswer(data.solvedAnswer ?? '');
        setExplanation(data.explanation ?? '');
      } else {
        setChallengeState('AVAILABLE');
      }
    } catch {
      setError('Failed to load riddle. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [difficulty, dateParam]);

  useEffect(() => {
    let sid = localStorage.getItem('advaitai_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('advaitai_session_id', sid);
    }
    setSessionId(sid);

    fetchRiddle();
    solveStartedAt.current = new Date().toISOString();
  }, [fetchRiddle]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/rank');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRank(typeof data.rank === 'number' ? data.rank : null);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.streak.totalXP]);

  const handleSubmit = async () => {
    if (!answer.trim() || challengeState === 'SOLVED' || challengeState === 'SUBMITTING') return;

    setChallengeState('SUBMITTING');
    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: answer,
          difficulty,
          date: dateParam,
          solveStartedAt: solveStartedAt.current,
          attemptCount: currentAttempt,
          hintsUsed,
        }),
      });
      const data = await res.json();

      if (data.isCorrect) {
        setChallengeState('SOLVED');
        setExplanation(data.explanation ?? '');
        setCorrectAnswer(data.answer ?? '');
        if (data.xpAwarded !== null && data.xpAwarded !== undefined) setXpAwarded(data.xpAwarded);
        if (data.newStreak !== null && data.newStreak !== undefined) setNewStreak(data.newStreak);
        if (data.bonuses) setBonuses(data.bonuses);

        await refreshSession();

        if (!data.alreadyCompleted) {
          setTimeout(() => setShowModal(true), 420);
        } else {
          setXpAwarded(0);
          setBonuses([]);
        }
      } else {
        setChallengeState('FAILED');
        setTimeout(() => setChallengeState('AVAILABLE'), 2000);
      }
    } catch {
      setError('Network error. Please try again.');
      setChallengeState('AVAILABLE');
    }
  };

  const handleGiveUp = async () => {
    setIsGivingUp(true);
    try {
      const res = await fetch('/api/riddles/give-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riddleId: riddle?.id, difficulty }),
      });
      const data = await res.json();
      if (data.success) {
        setChallengeState('ABANDONED');
        setExplanation(data.explanation ?? '');
        setCorrectAnswer(data.answer ?? '');
        setShowGiveUpModal(false);
      }
    } catch {
      setError('Failed to process request.');
    } finally {
      setIsGivingUp(false);
    }
  };

  const handleNewRiddle = (newRiddle: Partial<Riddle>) => {
    setMode('extra');
    setRiddle(newRiddle);
    setAnswer('');
    setChallengeState('AVAILABLE');
    setExplanation('');
    setCorrectAnswer('');
    setHintsUsed(0);
    setShowModal(false);
    setAttemptCount(0);
    setXpAwarded(null);
    setNewStreak(null);
    setBonuses([]);
    setExtraCount((prev) => prev + 1);
    solveStartedAt.current = new Date().toISOString();
  };

  const isCompleted = challengeState === 'SOLVED' || challengeState === 'ABANDONED';

  const recentActivity = session?.activityMap?.slice(0, 14) ?? [];

  return (
    <Container wide className="pb-24 pt-6 lg:pt-10">
      <LayoutGroup>
        <motion.header
          layout
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="group flex items-center font-mono text-[12px] font-medium text-text-3 transition-colors hover:text-text-1"
            >
              <ChevronLeft size={16} className="mr-1 transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
            <div className="hidden h-4 w-px bg-white/10 sm:block" />
            <div className="flex flex-col">
              <span className="font-mono text-[10px] font-medium text-text-4">
                {mode === 'daily' ? 'Daily puzzle' : 'Extra puzzle'}
              </span>
              <span className="text-sm font-semibold text-text-1">
                {mode === 'daily' ? dateParam : `Extra #${extraCount}`}
              </span>
            </div>
          </div>
        </motion.header>

        <main className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* LEFT — classified workspace */}
          <motion.div layout className="min-w-0 space-y-6">
            <div className="intel-doc relative min-h-[480px] px-5 py-8 sm:px-8 sm:py-10 lg:min-h-[520px]">
              {loading ? (
                <div className="flex w-full flex-col gap-5">
                  <Skeleton className="h-6 w-28 rounded-md" />
                  <Skeleton className="mt-4 h-8 w-full rounded-md" />
                  <Skeleton className="h-8 w-[92%] rounded-md" />
                  <Skeleton className="h-8 w-[68%] rounded-md" />
                  <div className="mt-auto pt-12">
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                </div>
              ) : error ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-error/20 bg-error-bg p-8 text-center text-error">
                  <p className="font-semibold">{error}</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.reload()}>
                    Reload
                  </Button>
                </div>
              ) : riddle ? (
                <div className="relative flex h-full flex-col">
                  <div className="mb-8 flex flex-wrap items-center gap-2">
                    <Badge variant="info" size="sm" className="font-mono uppercase tracking-wider">
                      {riddle.category}
                    </Badge>
                    <Badge
                      variant={difficulty === 'hard' ? 'danger' : difficulty === 'medium' ? 'warning' : 'success'}
                      size="sm"
                      className="font-mono uppercase tracking-wider"
                    >
                      {difficulty}
                    </Badge>
                    <span className="ml-auto hidden font-mono text-[10px] text-text-4 sm:inline">
                      {dateParam}
                    </span>
                  </div>

                  <p className="font-display text-balance text-[1.35rem] leading-snug text-text-1 sm:text-[1.55rem] lg:text-[1.65rem]">
                    {riddle.question}
                  </p>

                  <div className="mt-auto border-t border-white/[0.06] pt-8">
                    {!isCompleted ? (
                      <div className="flex flex-col gap-6">
                        <AnswerInput
                          value={answer}
                          onChange={setAnswer}
                          onSubmit={handleSubmit}
                          status={challengeState === 'FAILED' ? 'incorrect' : 'idle'}
                          disabled={challengeState === 'SUBMITTING'}
                        />
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <HintLadder
                            key={riddle.id ?? 'riddle'}
                            hint1={riddle.hint1 ?? ''}
                            hint2={riddle.hint2 ?? ''}
                            disabled={challengeState === 'SUBMITTING'}
                            onLevelChange={setHintsUsed}
                          />
                          <button
                            type="button"
                            onClick={() => setShowGiveUpModal(true)}
                            className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-text-4 transition-colors hover:text-text-2"
                          >
                            Show answer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={spring}
                        className="flex flex-col gap-6"
                      >
                        <div className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-black/35 p-4 sm:items-center">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${
                              challengeState === 'SOLVED' ? 'bg-success' : 'bg-text-4'
                            }`}
                          >
                            {challengeState === 'SOLVED' ? <Target size={18} /> : <Hash size={18} />}
                          </div>
                          <div>
                            <span className="font-mono text-[10px] font-medium text-text-3">
                              {challengeState === 'SOLVED' ? 'Correct answer' : 'Answer'}
                            </span>
                            <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-text-1">{correctAnswer}</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-black/25 p-5 text-sm leading-relaxed">
                          <span className="font-mono text-[10px] font-medium text-text-4">Explanation</span>
                          <p className="mt-3 whitespace-pre-wrap text-text-2">{explanation}</p>
                        </div>

                        {challengeState === 'SOLVED' && (
                          <div className="flex flex-wrap gap-3">
                            <Button variant="secondary" onClick={() => setShowModal(true)} className="border-white/10 bg-white/[0.04]">
                              Score details
                            </Button>
                            {mode === 'daily' && (
                              <Button variant="ghost" size="sm" onClick={() => setShowShareModal(true)} className="text-text-3">
                                <Share2 size={14} className="mr-2" />
                                Share
                              </Button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>

          {/* RIGHT — sticky operations rail */}
          <motion.aside
            layout
            className="glass-panel flex flex-col gap-6 p-6 lg:sticky lg:top-20 lg:self-start"
          >
            <div>
              <p className="font-mono text-[10px] font-medium text-text-4">Summary</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant={difficulty === 'hard' ? 'danger' : difficulty === 'medium' ? 'warning' : 'success'}
                  size="sm"
                  className="font-mono uppercase"
                >
                  {difficulty}
                </Badge>
                <Badge variant="info" size="sm" className="font-mono uppercase">
                  {riddle?.category ?? '—'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-text-4">Streak</span>
                <p className="mt-1 font-display text-2xl tabular-nums text-text-1">{session?.streak.currentStreak ?? 0}</p>
                <p className="text-[10px] text-text-3">consecutive dailies</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/30 p-3">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-text-4">Total XP</span>
                <p className="mt-1 font-display text-2xl tabular-nums text-text-1">
                  {(session?.streak.totalXP ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-text-3">lifetime</p>
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
              <div className="flex items-center gap-2 text-text-3">
                <Trophy size={14} />
                <span className="text-[11px] font-semibold text-text-2">Global rank (XP)</span>
              </div>
              <p className="mt-2 font-display text-3xl text-text-1">{rank != null ? `#${rank}` : '—'}</p>
            </div>

            <div className="flex items-center justify-between gap-3 border-y border-white/[0.06] py-4">
              <div className="flex items-center gap-2 text-text-3">
                <Clock size={14} />
                <span className="text-[12px] font-medium text-text-2">Next daily reset</span>
              </div>
              <CountdownTimer minimal />
            </div>

            <div className="flex flex-col gap-2">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-text-4">Quick actions</span>
              <div className="flex flex-col gap-2">
                {mode === 'daily' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-start border-white/10 bg-white/[0.04]"
                    onClick={() => setShowShareModal(true)}
                  >
                    <Share2 size={14} className="mr-2 opacity-80" />
                    Share brief
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-text-3 hover:text-text-1"
                  onClick={() => setShowChallengeModal(true)}
                >
                  <Flag size={14} className="mr-2 opacity-80" />
                  Report / challenge
                </Button>
              </div>
            </div>

            {riddle && !loading && !error && sessionId && (
              <div className="border-t border-white/[0.06] pt-2">
                <div className="mb-2 flex items-center gap-2 text-text-4">
                  <Sparkles size={12} />
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Generate more</span>
                </div>
                <GenerateMore sessionId={sessionId} difficulty={difficulty} onNewRiddle={handleNewRiddle} />
              </div>
            )}

            <div>
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-text-4">Continuity</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {recentActivity.map((entry) => (
                  <motion.div
                    key={entry.date}
                    title={entry.date}
                    whileHover={{ scale: 1.12 }}
                    className={`h-3 w-3 rounded-sm ${activityCellClass(entry.difficulty)}`}
                  />
                ))}
                {recentActivity.length === 0 && <span className="text-[12px] text-text-4">No solves in window</span>}
              </div>
            </div>
          </motion.aside>
        </main>
      </LayoutGroup>

      <Modal isOpen={showGiveUpModal} onClose={() => setShowGiveUpModal(false)} title="Declassify answer?" size="sm">
        <div className="flex flex-col gap-6">
          <p className="text-[14px] leading-relaxed text-text-2">
            This ends the run in <span className="text-text-1">no XP</span> mode. Your daily streak will{' '}
            <span className="text-text-1">not advance</span> from this path.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowGiveUpModal(false)} disabled={isGivingUp}>
              Stay in proof
            </Button>
            <Button variant="primary" fullWidth onClick={handleGiveUp} disabled={isGivingUp}>
              {isGivingUp ? 'Opening…' : 'Reveal'}
            </Button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {showModal && riddle && (
          <CelebrationModal
            explanation={explanation}
            answer={correctAnswer}
            streak={newStreak ?? session?.streak.currentStreak ?? 0}
            xpAwarded={xpAwarded}
            bonuses={bonuses}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && riddle && (
          <ShareModal riddle={riddle} date={dateParam} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
      <ChallengeModal
        isOpen={showChallengeModal}
        onClose={() => setShowChallengeModal(false)}
        riddleId={riddle?.id || ''}
        riddleQuestion={riddle?.question || ''}
      />
    </Container>
  );
}

export default function SolvePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SolvePage />
    </Suspense>
  );
}
