'use client';
interface Props { current: number; }
export default function StreakChip({ current }: Props) {
  if (current === 0) return null;
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 shadow-[0_0_12px_rgba(244,162,58,0.15)] transition-colors hover:bg-white/[0.05]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-orange-400 anim-pulse-soft">
        <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" fill="currentColor" />
      </svg>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-2">
        <span className="font-display text-[15px] font-bold text-text-1 tracking-tight mr-1">{current}</span> 
        day streak
      </span>
    </div>
  );
}
