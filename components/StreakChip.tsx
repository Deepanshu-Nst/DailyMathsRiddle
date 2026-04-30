'use client';
interface Props { current: number; }
export default function StreakChip({ current }: Props) {
  if (current === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--text-2)' }}>
        <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="mono label" style={{ color: 'var(--text-2)', fontSize: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.02em', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{current}</span>
        {' '}day streak
      </span>
    </div>
  );
}
