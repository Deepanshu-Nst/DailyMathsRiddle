'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AnswerInput from '@/components/AnswerInput';
import HintLadder from '@/components/HintLadder';
import CelebrationModal from '@/components/CelebrationModal';
import GenerateMore from '@/components/riddle/GenerateMore';
import { Riddle, ChallengeState } from '@/types';
import { Container } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChevronLeft, Target, Hash, RotateCw } from 'lucide-react';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';

export default function PracticePage() {
  const router = useRouter();
  const { session, refreshSession } = useChallengeSession();
  
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [riddle, setRiddle] = useState<Partial<Riddle> | null>(null);
  const [answer, setAnswer] = useState('');
  const [challengeState, setChallengeState] = useState<ChallengeState>('AVAILABLE');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Monotonically increasing key — guarantees React DOM remount on each new riddle
  const [riddleKey, setRiddleKey] = useState(0);
  
  const sessionIdRef = useRef<string>('');
  const solveStartedAt = useRef<string | null>(null);

  useEffect(() => {
    let sid = localStorage.getItem('advaitai_session_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('advaitai_session_id', sid);
    }
    sessionIdRef.current = sid;
  }, []);

  const handleNewRiddle = (newRiddle: Partial<Riddle>) => {
    // Set riddle state FIRST
    setRiddle(newRiddle);
    // Increment key to force DOM remount — the displayed content MUST change
    setRiddleKey(prev => prev + 1);
    // Reset all solve state
    setIsGenerating(false);
    setAnswer('');
    setChallengeState('AVAILABLE');
    setExplanation('');
    setCorrectAnswer('');
    setHintsUsed(0);
    setShowModal(false);
    setAttemptCount(0);
    setXpAwarded(null);
    solveStartedAt.current = new Date().toISOString();
  };

  const handleSubmit = async () => {
    if (!answer.trim() || challengeState === 'SOLVED' || challengeState === 'SUBMITTING' || !riddle) return;

    setChallengeState('SUBMITTING');
    const currentAttempt = attemptCount + 1;
    setAttemptCount(currentAttempt);

    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswer: answer,
          difficulty: riddle.difficulty || difficulty,
          riddleId: riddle.id,
          solveStartedAt: solveStartedAt.current,
          attemptCount: currentAttempt,
          hintsUsed,
          isPractice: true,
        }),
      });
      const data = await res.json();

      if (data.isCorrect) {
        setChallengeState('SOLVED');
        setExplanation(data.explanation ?? '');
        setCorrectAnswer(data.answer ?? '');
        if (data.xpAwarded) setXpAwarded(data.xpAwarded);

        await refreshSession();

        if (!data.alreadyCompleted) {
          setTimeout(() => setShowModal(true), 420);
        }
      } else {
        setChallengeState('FAILED');
        setTimeout(() => setChallengeState('AVAILABLE'), 2000);
      }
    } catch {
      setChallengeState('AVAILABLE');
    }
  };

  return (
    <Container wide className="pb-24 pt-6 lg:pt-10">
      <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
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
            <span className="font-mono text-[10px] font-medium text-text-4">Practice Mode</span>
            <span className="text-sm font-semibold text-text-1">Extra Challenges</span>
          </div>
        </div>
      </header>

      <main className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        {/* LEFT — Workspace */}
        <div className="min-w-0 space-y-6">
          <div className="content-panel relative min-h-[480px] px-8 py-10 sm:px-10 sm:py-12 bg-bg-muted/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            {!riddle ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <Target size={48} className="text-text-4 mb-6 opacity-50" />
                <h2 className="text-2xl font-display font-semibold mb-2">Practice Challenges</h2>
                <p className="text-text-3 mb-8 max-w-sm">
                  Generate unlimited practice riddles to hone your skills and earn extra XP without affecting your daily streak.
                </p>
                <div className="flex items-center gap-2 mb-8 bg-black/20 p-2 rounded-lg border border-white/5">
                  {(['easy', 'medium', 'hard'] as const).map(diff => (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`px-4 py-1.5 rounded-md font-mono text-xs uppercase tracking-wider transition-all ${
                        difficulty === diff
                          ? 'bg-primary text-black font-bold shadow-sm'
                          : 'text-text-4 hover:text-text-2 hover:bg-white/5'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
                {sessionIdRef.current && (
                  <div className="w-full max-w-xs">
                    <GenerateMore 
                      sessionId={sessionIdRef.current} 
                      difficulty={difficulty} 
                      onNewRiddle={handleNewRiddle} 
                      onStartGeneration={() => setIsGenerating(true)}
                      currentRiddleId={undefined}
                    />
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <RotateCw size={32} className="text-primary animate-spin mb-4" />
                <p className="text-text-3 font-mono text-xs uppercase tracking-widest">Architecting Riddle...</p>
              </div>
            ) : (
              /* KEY: riddleKey forces full DOM remount — the riddle MUST visibly change */
              <div key={riddleKey} className="relative flex h-full flex-col">
                <div className="mb-8 flex flex-wrap items-center gap-2">
                  <Badge variant="info" size="sm" className="font-mono uppercase tracking-wider">
                    {riddle.category}
                  </Badge>
                  <Badge
                    variant={riddle.difficulty === 'hard' ? 'danger' : riddle.difficulty === 'medium' ? 'warning' : 'success'}
                    size="sm"
                    className="font-mono uppercase tracking-wider"
                  >
                    {riddle.difficulty}
                  </Badge>
                </div>

                <h2 className="font-display text-balance text-[clamp(1.75rem,4vw,2.5rem)] leading-snug text-text-1">
                  {riddle.question}
                </h2>

                <div className="mt-auto border-t border-white/[0.06] pt-8">
                  {challengeState !== 'SOLVED' ? (
                    <div className="flex flex-col gap-6">
                      <AnswerInput
                        value={answer}
                        onChange={setAnswer}
                        onSubmit={handleSubmit}
                        status={challengeState === 'FAILED' ? 'incorrect' : 'idle'}
                        disabled={challengeState === 'SUBMITTING'}
                      />
                      <HintLadder
                        hint1={riddle.hint1 ?? ''}
                        hint2={riddle.hint2 ?? ''}
                        disabled={challengeState === 'SUBMITTING'}
                        onLevelChange={setHintsUsed}
                      />
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="flex items-start gap-4 rounded-xl border border-white/[0.08] bg-black/35 p-4 sm:items-center">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white bg-success">
                          <Target size={18} />
                        </div>
                        <div>
                          <span className="font-mono text-[10px] font-medium text-text-3">Correct answer</span>
                          <p className="mt-1 font-mono text-lg font-semibold tracking-tight text-text-1">{correctAnswer}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/[0.06] bg-black/25 p-5 text-sm leading-relaxed">
                        <span className="font-mono text-[10px] font-medium text-text-4">Explanation</span>
                        <p className="mt-3 whitespace-pre-wrap text-text-2">{explanation}</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Next action */}
        {riddle && (
          <aside className="glass-panel flex flex-col gap-6 p-6 sticky top-20 self-start">
            <div className="flex flex-col gap-2 mb-4">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-text-4">Settings</span>
              <div className="flex items-center gap-2 mt-2 bg-black/20 p-1.5 rounded-lg border border-white/5">
                {(['easy', 'medium', 'hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-1.5 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all ${
                      difficulty === diff
                        ? 'bg-primary text-black font-bold shadow-sm'
                        : 'text-text-4 hover:text-text-2 hover:bg-white/5'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <GenerateMore 
                sessionId={sessionIdRef.current} 
                difficulty={difficulty} 
                onNewRiddle={handleNewRiddle} 
                onStartGeneration={() => setIsGenerating(true)}
                currentRiddleId={riddle?.id}
              />
            </div>
          </aside>
        )}
      </main>

      <AnimatePresence>
        {showModal && (
          <CelebrationModal
            explanation={explanation}
            answer={correctAnswer}
            streak={session?.streak.currentStreak ?? 0}
            xpAwarded={xpAwarded}
            bonuses={[]}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </Container>
  );
}
