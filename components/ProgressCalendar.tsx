'use client';

import { useMemo, useState } from 'react';
import type { DailySolvedEntry, Difficulty } from '@/types';

interface Props {
  solvedDates: DailySolvedEntry[];
  days?: number;
  todayIST: string;
}

const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];

function getDifficultyOpacity(diff: Difficulty): number {
  if (diff === 'easy') return 0.25;
  if (diff === 'medium') return 0.5;
  return 0.85;
}

function getDifficultyColor(diff: Difficulty): string {
  // Use a monochromatic primary heat scale instead of distinct warning/error colors
  return 'var(--color-primary)';
}

/**
 * Activity calendar — GitHub-style contribution graph.
 * - 90-day window by default
 * - 7-column grid aligned to actual weekdays
 * - Subtle opacity-based heat mapping by difficulty
 * - Hover tooltip showing date, difficulty, streak
 */
export default function ProgressCalendar({ solvedDates, days = 90, todayIST }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { grid, monthLabels } = useMemo(() => {
    // Parse the server-provided IST date string (YYYY-MM-DD) as local midnight
    // to avoid any timezone shifting during date math.
    const [y, m, d] = todayIST.split('-').map(Number);
    const today = new Date(y, m - 1, d);
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

    const todayStr = todayIST;
    const rangeStart = new Date(today);
    rangeStart.setDate(rangeStart.getDate() - days + 1);
    
    // Format rangeStart back to YYYY-MM-DD
    const ry = rangeStart.getFullYear();
    const rm = String(rangeStart.getMonth() + 1).padStart(2, '0');
    const rd = String(rangeStart.getDate()).padStart(2, '0');
    const rangeStartStr = `${ry}-${rm}-${rd}`;

    const cursor = new Date(start);
    let currentWeek: typeof weeks[0] = [];
    const mLabels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    while (cursor <= today || currentWeek.length > 0) {
      const cy = cursor.getFullYear();
      const cm = String(cursor.getMonth() + 1).padStart(2, '0');
      const cd = String(cursor.getDate()).padStart(2, '0');
      const dateStr = `${cy}-${cm}-${cd}`;
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
  }, [solvedDates, days, todayIST]);

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
                      className={`h-[11px] w-[11px] rounded-[3px] transition-all duration-300 ${
                        !cell.inRange
                          ? 'bg-transparent'
                          : cell.isToday && !isSolved
                          ? 'ring-[1.5px] ring-white/20 bg-transparent'
                          : isSolved
                          ? 'shadow-[0_0_8px_rgba(244,162,58,0.15)]'
                          : 'bg-white/[0.04] hover:bg-white/[0.08]'
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
                      <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-[#111111]/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur-md transition-all">
                        <span className="font-semibold text-text-1">
                          {new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {isSolved ? (
                          <span className="ml-2 font-mono uppercase tracking-widest text-primary/90 text-[9px]">
                            {difficulty}
                          </span>
                        ) : (
                          <span className="ml-2 font-mono uppercase tracking-widest text-text-4 text-[9px]">
                            Unsolved
                          </span>
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
      <div className="mt-2 flex items-center gap-3 text-[9px] font-mono uppercase tracking-[0.1em] text-text-4">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-[11px] w-[11px] rounded-[3px] bg-white/[0.04]" />
          <div className="h-[11px] w-[11px] rounded-[3px] bg-primary/25" />
          <div className="h-[11px] w-[11px] rounded-[3px] bg-primary/50" />
          <div className="h-[11px] w-[11px] rounded-[3px] bg-primary/85" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
