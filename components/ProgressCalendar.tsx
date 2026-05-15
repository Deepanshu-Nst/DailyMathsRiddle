'use client';

import { useMemo, useState } from 'react';
import type { DailySolvedEntry, Difficulty } from '@/types';

interface Props {
  solvedDates: DailySolvedEntry[];
  days?: number;
}

const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

function getDifficultyOpacity(diff: Difficulty): number {
  if (diff === 'easy') return 0.4;
  if (diff === 'medium') return 0.65;
  return 1;
}

function getDifficultyColor(diff: Difficulty): string {
  if (diff === 'easy') return 'var(--color-success)';
  if (diff === 'hard') return 'var(--color-error, #ef4444)';
  return 'var(--color-primary)';
}

/**
 * Activity calendar — GitHub-style contribution graph.
 * - 90-day window by default
 * - 7-column grid aligned to actual weekdays
 * - Subtle opacity-based heat mapping by difficulty
 * - Hover tooltip showing date, difficulty, streak
 */
export default function ProgressCalendar({ solvedDates, days = 90 }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);

    // Align start to the previous Sunday
    const startDow = start.getDay(); // 0=Sun
    start.setDate(start.getDate() - startDow);

    // Build solvedMap for O(1) lookups
    const solvedMap = new Map<string, DailySolvedEntry>();
    for (const entry of solvedDates) {
      solvedMap.set(entry.date, entry);
    }

    // Generate day cells grouped into weeks (columns)
    const weeks: Array<Array<{
      date: string;
      dow: number;
      isToday: boolean;
      entry: DailySolvedEntry | null;
      inRange: boolean;
    }>> = [];

    const todayStr = today.toISOString().split('T')[0];
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - days + 1);
    const rangeStartStr = rangeStart.toISOString().split('T')[0];

    const cursor = new Date(start);
    let currentWeek: typeof weeks[0] = [];
    const mLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    while (cursor <= today || currentWeek.length > 0) {
      const dateStr = cursor.toISOString().split('T')[0];
      const dow = cursor.getDay();

      if (dow === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      // Track month labels (show on first day of a new month)
      const month = cursor.getMonth();
      if (month !== lastMonth) {
        mLabels.push({
          label: cursor.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: weeks.length,
        });
        lastMonth = month;
      }

      currentWeek.push({
        date: dateStr,
        dow,
        isToday: dateStr === todayStr,
        entry: solvedMap.get(dateStr) ?? null,
        inRange: dateStr >= rangeStartStr && dateStr <= todayStr,
      });

      if (cursor > today && dow === 6) break;
      cursor.setDate(cursor.getDate() + 1);
    }

    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { grid: weeks, monthLabels: mLabels };
  }, [solvedDates, days]);

  // Find hovered entry details
  const hoveredEntry = hovered ? solvedDates.find((e) => e.date === hovered) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Month labels */}
      <div className="flex gap-0 ml-[26px]">
        {monthLabels.map((ml, i) => (
          <div
            key={`${ml.label}-${i}`}
            className="text-[10px] font-medium text-text-4"
            style={{
              position: 'relative',
              left: `${ml.weekIndex * 14}px`,
              marginRight: i < monthLabels.length - 1 ? `${(monthLabels[i + 1]?.weekIndex - ml.weekIndex) * 14 - 30}px` : 0,
            }}
          >
            {ml.label}
          </div>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-0.5 mr-1.5 pt-0">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="flex h-[12px] w-[14px] items-center justify-end text-[9px] text-text-4">
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-0.5">
          {grid.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((cell) => {
                const isSolved = cell.entry !== null;
                const difficulty = cell.entry?.difficulty ?? 'medium';

                return (
                  <div
                    key={cell.date}
                    className="relative cursor-default"
                    onMouseEnter={() => setHovered(cell.date)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div
                      className={`h-[12px] w-[12px] rounded-[2px] transition-colors ${
                        !cell.inRange
                          ? 'bg-transparent'
                          : cell.isToday && !isSolved
                          ? 'ring-1 ring-text-3/40 bg-surface'
                          : isSolved
                          ? ''
                          : 'bg-surface-hover'
                      }`}
                      style={
                        isSolved && cell.inRange
                          ? {
                              backgroundColor: getDifficultyColor(difficulty),
                              opacity: getDifficultyOpacity(difficulty),
                            }
                          : undefined
                      }
                    />

                    {/* Tooltip */}
                    {hovered === cell.date && cell.inRange && (
                      <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-bg px-3 py-1.5 text-[11px] shadow-lg">
                        <span className="font-medium text-text-1">
                          {new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {isSolved ? (
                          <span className="ml-2 text-text-2">
                            Solved ({difficulty})
                          </span>
                        ) : (
                          <span className="ml-2 text-text-4">No solve</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-3 text-[10px] text-text-4">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="h-[10px] w-[10px] rounded-[2px] bg-surface-hover" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-success/40" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/65" />
          <div className="h-[10px] w-[10px] rounded-[2px] bg-error" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
