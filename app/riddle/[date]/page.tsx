'use client';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AnswerInput from '@/components/AnswerInput';
import HintLadder from '@/components/HintLadder';
import CelebrationModal from '@/components/CelebrationModal';
import ShareModal from '@/components/share/ShareModal';
import CountdownTimer from '@/components/CountdownTimer';
import GenerateMore from '@/components/riddle/GenerateMore';
import { ChallengeModal } from '@/components/riddles/ChallengeModal';
import { Difficulty, Riddle, ChallengeState } from '@/types';
import { getTodayUTC } from '@/lib/timezone';
import { Container } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Feedback';
import { ChevronLeft, Share2, Flag, RotateCcw, Clock, Target, Hash } from 'lucide-react';
import { staggerContainer, fadeUp } from '@/lib/motion';
import { useChallengeSession } from '@/components/providers/ChallengeSessionProvider';

function SolvePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { date } = useParams<{ date: string }>();
  const dateParam = date ?? getTodayUTC();
  const difficulty = (searchParams.get('difficulty') as Difficulty) ?? 'medium';

  const { session, refreshSession } = useChallengeSession();
  
  const [riddle, setRiddle] = useState<Partial<Riddle> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answer, setAnswer] = useState('');
  
  // Strict Challenge State
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
  
  // Gamification payload
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [newStreak, setNewStreak] = useState<number | null>(null);
  const [bonuses, setBonuses] = useState<Array<{ reason: string; amount: number }>>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const solveStartedAt = useRef<string | null>(null);

  const fetchRiddle = useCallback(async () => {
    setLoading(true); setError('');
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

  const [showGiveUpModal, setShowGiveUpModal] = useState(false);
  const [isGivingUp, setIsGivingUp] = useState(false);

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
          userAnswer: answer, difficulty, date: dateParam,
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
        if (data.xpAwarded !== null) setXpAwarded(data.xpAwarded);
        if (data.newStreak !== null) setNewStreak(data.newStreak);
        if (data.bonuses) setBonuses(data.bonuses);
        
        // Refresh global session state (streak, XP, etc.)
        await refreshSession();
        
        setTimeout(() => setShowModal(true), 400);
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
    setExtraCount(prev => prev + 1);
    solveStartedAt.current = new Date().toISOString();
  };

  const isCompleted = challengeState === 'SOLVED' || challengeState === 'ABANDONED';

  return (
    <Container className="pt-6 pb-20">
      {/* Top Bar */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center text-[13px] font-medium text-text-3 hover:text-text-1 transition-colors group"
          >
            <ChevronLeft size={16} className="mr-1 group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <div className="h-4 w-px bg-border" />
          <h2 className="text-[13px] font-semibold text-text-1">
            {mode === 'daily' ? `Daily Challenge • ${dateParam}` : `Extra Challenge #${extraCount}`}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          {mode === 'daily' && (
            <Button variant="ghost" size="sm" onClick={() => setShowShareModal(true)} className="text-text-3 hover:text-text-1">
              <Share2 size={14} className="mr-2" />
              Share
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowChallengeModal(true)} className="text-text-3 hover:text-text-1">
            <Flag size={14} className="mr-2" />
            Report
          </Button>
        </div>
      </motion.div>

      <main className="grid lg:grid-cols-[1.5fr,0.5fr] gap-8 items-start">
        
        {/* LEFT: Problem Workspace */}
        <div className="flex flex-col gap-6">
          <div>
            <div className="min-h-[500px] flex flex-col p-6 md:p-10 bg-white border border-border-subtle rounded-2xl">
              {loading ? (
                <div className="flex flex-col gap-5 w-full">
                  <Skeleton className="h-6 w-24 rounded-md" />
                  <Skeleton className="h-8 w-full rounded-md mt-4" />
                  <Skeleton className="h-8 w-[90%] rounded-md" />
                  <Skeleton className="h-8 w-[70%] rounded-md" />
                  <div className="mt-auto pt-10"><Skeleton className="h-14 w-full rounded-lg" /></div>
                </div>
              ) : error ? (
                <div className="p-8 text-center bg-error-bg rounded-xl text-error border border-error/10 flex flex-col items-center justify-center h-full">
                  <p className="font-semibold">{error}</p>
                  <Button variant="secondary" size="sm" className="mt-4" onClick={() => window.location.reload()}>Refresh Page</Button>
                </div>
              ) : riddle ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-8">
                    <Badge variant="info" size="sm" className="uppercase tracking-wider text-[10px]">{riddle.category}</Badge>
                    <Badge variant={difficulty === 'hard' ? 'danger' : difficulty === 'medium' ? 'warning' : 'success'} size="sm" className="uppercase tracking-wider text-[10px]">
                      {difficulty}
                    </Badge>
                  </div>

                  <div className="text-[17px] sm:text-[19px] font-medium text-text-1 leading-relaxed mb-12">
                    {riddle.question}
                  </div>

                  <div className="mt-auto pt-8 border-t border-border-subtle">
                    {!isCompleted ? (
                      <div className="flex flex-col gap-6">
                        <AnswerInput
                          value={answer}
                          onChange={setAnswer}
                          onSubmit={handleSubmit}
                          status={challengeState === 'FAILED' ? 'incorrect' : 'idle'}
                          disabled={challengeState === 'SUBMITTING'}
                        />
                        <div className="flex items-center justify-between">
                          <HintLadder
                            hint1={riddle.hint1 ?? ''}
                            hint2={riddle.hint2 ?? ''}
                            disabled={challengeState === 'SUBMITTING'}
                          />
                          <button 
                            onClick={() => setShowGiveUpModal(true)}
                            className="text-[12px] font-semibold text-text-4 hover:text-text-2 transition-colors uppercase tracking-wider"
                          >
                            Reveal Solution
                          </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-6"
                      >
                        <div className="flex items-center gap-3 bg-bg-subtle p-4 rounded-lg border border-border">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 ${challengeState === 'SOLVED' ? 'bg-success' : 'bg-text-4'}`}>
                            {challengeState === 'SOLVED' ? <Target size={16} /> : <Hash size={16} />}
                          </div>
                          <div>
                            <span className="text-[12px] font-semibold text-text-3 uppercase tracking-wider block mb-0.5">
                              {challengeState === 'SOLVED' ? 'Correct Answer' : 'Official Answer'}
                            </span>
                            <span className="font-mono text-[16px] font-bold text-text-1">{correctAnswer}</span>
                          </div>
                        </div>
                        
                        <div className="p-5 bg-bg-muted/50 rounded-lg border border-border-subtle text-[14px] leading-relaxed">
                          <strong className="text-text-1 block mb-2 font-semibold">Explanation</strong>
                          <span className="text-text-2 whitespace-pre-wrap">{explanation}</span>
                        </div>

                        {challengeState === 'SOLVED' && (
                          <div className="flex gap-3 mt-2">
                            <Button variant="secondary" onClick={() => setShowModal(true)}>
                              View Score Breakdown
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* RIGHT: Problem Context (Sticky) */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="flex flex-col gap-5">
            
            {/* Context Header */}
            <div className="flex flex-col gap-1.5 pb-5 border-b border-border-subtle">
              <span className="text-[11px] font-semibold text-text-3 uppercase tracking-widest">Solving Cockpit</span>
              <div className="flex items-center gap-2">
                <Badge variant={difficulty === 'hard' ? 'danger' : difficulty === 'medium' ? 'warning' : 'success'} size="sm" className="uppercase tracking-wider text-[10px]">
                  {difficulty}
                </Badge>
                <Badge variant="info" size="sm" className="uppercase tracking-wider text-[10px]">{riddle?.category || 'General'}</Badge>
              </div>
            </div>

            {/* Streak & XP */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Streak</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display text-text-1">{session?.streak.currentStreak || 0}</span>
                  <span className="text-[12px] font-medium text-text-3">days</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">XP Earned</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display text-text-1">{session?.streak.totalXP?.toLocaleString() || 0}</span>
                  <span className="text-[12px] font-medium text-text-3">total</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Countdown */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-text-3" />
                <span className="text-[12px] font-semibold text-text-2">Next Challenge</span>
              </div>
              <div className="text-[13px] font-mono text-text-1 font-semibold">
                <CountdownTimer />
              </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* Generate More */}
            {riddle && !loading && !error && sessionId && (
              <div className="py-2">
                <GenerateMore
                  sessionId={sessionId}
                  difficulty={difficulty}
                  onNewRiddle={handleNewRiddle}
                />
              </div>
            )}

            {/* Tiny Activity Preview */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[11px] font-semibold text-text-3 uppercase tracking-wider">Recent Activity</span>
              <div className="flex flex-wrap gap-1">
                {session?.activityMap.slice(0, 14).map((entry, idx) => (
                  <div key={idx} className={`w-3 h-3 rounded-[2px] bg-success opacity-${Math.max(40, 100 - idx * 10)}`} title={entry.date} />
                ))}
                {(!session?.activityMap || session.activityMap.length === 0) && (
                  <span className="text-[12px] text-text-4">No recent solves</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Give Up Modal */}
      <Modal
        isOpen={showGiveUpModal}
        onClose={() => setShowGiveUpModal(false)}
        title="Reveal Solution?"
        size="sm"
      >
        <div className="flex flex-col gap-6">
          <p className="text-[14px] text-text-2 leading-relaxed">
            The challenge will end. The solution will be revealed, but you will <strong className="text-text-1">earn no XP</strong> and your daily streak will <strong className="text-text-1">not continue</strong>.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={() => setShowGiveUpModal(false)}
              disabled={isGivingUp}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              fullWidth 
              onClick={handleGiveUp}
              disabled={isGivingUp}
            >
              {isGivingUp ? 'Revealing...' : 'Reveal Solution'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modals */}
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
          <ShareModal
            riddle={riddle}
            date={dateParam}
            onClose={() => setShowShareModal(false)}
          />
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
    <Suspense fallback={<div className="min-h-screen bg-bg-subtle" />}>
      <SolvePage />
    </Suspense>
  );
}
