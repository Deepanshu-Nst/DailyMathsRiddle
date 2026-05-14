'use client';

import { DailySolvedEntry } from '@/types';
import { addOfficialCalendarDays, getOfficialDailyDate } from '@/lib/timezone';

interface Props {
  solvedDates: DailySolvedEntry[];
}

export default function ProgressCalendar({ solvedDates }: Props) {
  const today = getOfficialDailyDate();
  const byDate = new Map(solvedDates.map((e) => [e.date, e]));

  const rows: { dateStr: string; entry?: DailySolvedEntry }[][] = [];
  let row: { dateStr: string; entry?: DailySolvedEntry }[] = [];
  for (let i = 0; i < 30; i++) {
    const dateStr = addOfficialCalendarDays(today, -(29 - i));
    row.push({ dateStr, entry: byDate.get(dateStr) });
    if (row.length === 7) {
      rows.push(row);
      row = [];
    }
  }
  if (row.length) rows.push(row);

  const cellClass = (d: { dateStr: string; entry?: DailySolvedEntry }) => {
    const classes = ['cal-cell'];
    if (d.entry) classes.push(`solved-${d.entry.difficulty}`);
    if (d.dateStr === today) classes.push('is-today');
    return classes.join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        {rows.map((week, wi) => (
          <div key={wi} className="flex gap-1.5">
            {week.map((d) => (
              <div
                key={d.dateStr}
                className={cellClass(d)}
                title={`${d.dateStr}${d.entry ? ` · ${d.entry.difficulty}` : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-4">
        {(['easy', 'medium', 'hard'] as const).map((diff) => (
          <div key={diff} className="flex items-center gap-2">
            <div className={`cal-cell solved-${diff}`} style={{ width: 10, height: 10, borderRadius: 2 }} />
            <span className="text-[11px] capitalize text-text-3">{diff}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="cal-cell" style={{ width: 10, height: 10, borderRadius: 2 }} />
          <span className="text-[11px] text-text-4">Rest</span>
        </div>
      </div>
    </div>
  );
}
