'use client';
import { DailySolvedEntry } from '@/types';

interface Props { solvedDates: DailySolvedEntry[]; }

export default function ProgressCalendar({ solvedDates }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const days: { dateStr: string; entry?: DailySolvedEntry }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = solvedDates.find(e => e.date === dateStr);
    days.push({ dateStr, entry });
  }

  const cellClass = (d: { dateStr: string; entry?: DailySolvedEntry }) => {
    const classes = ['cal-cell'];
    if (d.entry) classes.push(`solved-${d.entry.difficulty}`);
    if (d.dateStr === today) classes.push('is-today');
    return classes.join(' ');
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
        {days.map(d => (
          <div key={d.dateStr} className={cellClass(d)} title={d.dateStr} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {(['easy', 'medium', 'hard'] as const).map(diff => (
          <div key={diff} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div className={`cal-cell solved-${diff}`} style={{ width: 10, height: 10, borderRadius: 2 }} />
            <span style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'capitalize' }}>{diff}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div className="cal-cell" style={{ width: 10, height: 10, borderRadius: 2 }} />
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Missed</span>
        </div>
      </div>
    </div>
  );
}
