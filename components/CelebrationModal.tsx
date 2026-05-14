'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Flame, Sparkles } from 'lucide-react';
import CountdownTimer from '@/components/CountdownTimer';
import { springSnappy } from '@/lib/motion';

interface Props {
  explanation: string;
  answer: string;
  streak: number;
  onClose: () => void;
  xpAwarded?: number | null;
  bonuses?: Array<{ reason: string; amount: number }>;
}

function useAnimatedInt(target: number, active: boolean, durationMs = 900) {
  const [v, setV] = useState(0);
  const start = useRef<number | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    setV(0);
    start.current = null;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const t = Math.min(1, (now - start.current) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setV(Math.round(target * eased));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [target, active, durationMs]);

  return v;
}

export default function CelebrationModal({ explanation, answer, streak, onClose, xpAwarded, bonuses }: Props) {
  const xpTarget = typeof xpAwarded === 'number' && xpAwarded > 0 ? xpAwarded : 0;
  const xpDisplay = useAnimatedInt(xpTarget, xpTarget > 0, 1000);

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={springSnappy}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.1] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_120px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
          <div className="relative space-y-8 px-6 py-8 sm:px-10 sm:py-10">
            <div className="text-center">
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 260 }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-xl border border-border-dark bg-bg-muted text-primary"
              >
                <Sparkles size={28} strokeWidth={1.5} />
              </motion.div>
              <p className="font-mono text-[10px] font-medium text-text-3">Correct</p>
              <h2 className="mt-2 font-display text-[1.85rem] leading-tight text-text-1 sm:text-[2rem]">Saved to your record</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-text-2">
                XP and streak below reflect what was written to the database for this solve.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.div layout className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-left">
                <div className="flex items-center gap-2 text-text-2">
                  <Flame size={14} />
                  <span className="font-mono text-[9px] font-medium uppercase tracking-wide text-text-4">Streak</span>
                </div>
                <p className="mt-2 font-display text-3xl tabular-nums text-text-1">{streak}</p>
                <p className="text-[10px] text-text-3">consecutive dailies</p>
              </motion.div>
              <motion.div layout className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-left">
                <span className="font-mono text-[9px] font-medium uppercase tracking-wide text-text-4">XP this solve</span>
                <p className="mt-2 font-display text-3xl tabular-nums text-primary">+{xpDisplay}</p>
                <p className="text-[10px] text-text-3">XP awarded</p>
              </motion.div>
            </div>

            {(bonuses ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {(bonuses ?? []).map((b, i) => (
                  <Badge key={i} variant="secondary" size="sm" className="font-mono uppercase tracking-wide">
                    {b.reason === 'first_try_bonus'
                      ? 'First strike'
                      : b.reason === 'fast_solve_bonus'
                        ? 'Velocity'
                        : b.reason.startsWith('streak_milestone')
                          ? 'Milestone'
                          : b.reason}{' '}
                    +{b.amount}
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-4 rounded-xl border border-white/[0.06] bg-black/30 p-5">
              <div>
                <span className="text-[11px] font-medium text-text-3">Explanation</span>
                <p className="mt-2 text-sm italic leading-relaxed text-text-2">&ldquo;{explanation}&rdquo;</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
                <span className="font-mono text-[9px] font-medium text-text-4">Answer</span>
                <span className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-sm font-semibold text-text-1">
                  {answer}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="font-mono text-[9px] font-medium text-text-4">Next daily reset</span>
                <div className="mt-1">
                  <CountdownTimer />
                </div>
              </div>
              <Button size="lg" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </motion.div>
    </motion.div>
  );
}
