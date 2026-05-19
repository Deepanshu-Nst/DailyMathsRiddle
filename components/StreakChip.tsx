'use client';

import { motion } from 'framer-motion';

interface Props { current: number; }

export default function StreakChip({ current }: Props) {
  if (current === 0) return null;
  
  const isMilestone = current >= 7;
  
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={[
        'flex items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all',
        isMilestone
          ? 'border-primary/20 bg-primary/[0.06] shadow-[0_0_20px_rgba(108,123,255,0.15)] hover:bg-primary/[0.1]'
          : 'border-white/[0.08] bg-white/[0.03] shadow-[0_0_12px_rgba(244,162,58,0.12)] hover:bg-white/[0.05]',
      ].join(' ')}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={`${isMilestone ? 'text-primary' : 'text-orange-400'} anim-pulse-soft`}>
        <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" fill="currentColor" />
      </svg>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-2">
        <span className={`font-display text-[15px] font-bold tracking-tight mr-1 ${isMilestone ? 'gradient-text-accent' : 'text-text-1'}`}>
          {current}
        </span> 
        day streak
      </span>
    </motion.div>
  );
}
