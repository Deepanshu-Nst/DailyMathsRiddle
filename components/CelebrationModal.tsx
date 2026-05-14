'use client';

import { motion } from 'framer-motion';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Flame, Timer } from 'lucide-react';
import CountdownTimer from './CountdownTimer';

interface Props {
  explanation: string;
  answer: string;
  streak: number;
  onClose: () => void;
  xpAwarded?: number | null;
  bonuses?: Array<{ reason: string; amount: number }>;
}

export default function CelebrationModal({ explanation, answer, streak, onClose, xpAwarded, bonuses }: Props) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Solution Correct" className="max-w-xl">
      <div className="flex flex-col gap-8">
        {/* Header Celebration */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
            <CheckCircle2 size={40} strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-black text-text-1 tracking-tight">
            {streak > 1 ? `${streak} Day Streak!` : 'First Step Taken!'}
          </h2>
          <p className="text-text-3 text-sm max-w-sm">
            Mathematical excellence is built through daily persistence. Your mind is sharpening.
          </p>
        </div>

        {/* XP & Rewards */}
        <div className="flex justify-center flex-wrap gap-2">
          {xpAwarded && (
            <Badge variant="primary" size="lg" className="px-4 py-1.5 text-sm">
              +{xpAwarded} XP
            </Badge>
          )}
          {(bonuses ?? []).map((b, i) => (
            <Badge key={i} variant="secondary" size="lg" className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
              {b.reason === 'first_try_bonus' ? '⚡ First try' :
               b.reason === 'fast_solve_bonus' ? '🏃 Fast solve' :
               b.reason.startsWith('streak_milestone') ? `🔥 Streak` :
               b.reason} +{b.amount}
            </Badge>
          ))}
        </div>

        {/* Solution Details */}
        <div className="p-6 bg-bg-subtle border border-border rounded-xl flex flex-col gap-4">
          <div>
            <span className="label block mb-2 text-primary font-black">Official Solution</span>
            <p className="text-sm text-text-2 leading-relaxed italic">
              "{explanation}"
            </p>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-border">
            <span className="label font-black">Answer</span>
            <span className="px-3 py-1 bg-white border border-border rounded-md font-mono text-sm font-bold text-text-1 shadow-sm">
              {answer}
            </span>
          </div>
        </div>

        {/* Next Steps / Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 p-4 bg-bg-subtle/50 rounded-xl border border-border/50">
            <span className="text-[10px] uppercase font-bold text-text-4 tracking-widest flex items-center gap-1.5">
              <Flame size={12} className="text-primary" />
              Current Streak
            </span>
            <span className="text-2xl font-black text-text-1">{streak} Days</span>
          </div>
          <div className="flex flex-col gap-1 p-4 bg-bg-subtle/50 rounded-xl border border-border/50">
            <span className="text-[10px] uppercase font-bold text-text-4 tracking-widest flex items-center gap-1.5">
              <Timer size={12} className="text-text-3" />
              Next Riddle
            </span>
            <div className="text-lg font-bold text-text-1">
              <CountdownTimer />
            </div>
          </div>
        </div>

        <Button onClick={onClose} size="lg" className="w-full shadow-lg shadow-primary/10">
          Continue to Ritual
        </Button>
      </div>
    </Modal>
  );
}
