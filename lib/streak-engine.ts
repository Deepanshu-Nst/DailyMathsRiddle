'use client';
import { StreakData, DailySolvedEntry, Difficulty, ProgressState } from '@/types';
import { getTodayUTC } from './timezone';

const STREAK_KEY = 'advaitai_streak';
const SOLVED_KEY = 'advaitai_solved';

export function loadStreakData(): StreakData {
  if (typeof window === 'undefined') return defaultStreak();
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    const solved = loadSolvedDates();
    const today = getTodayUTC();

    if (!raw) return recalculate([], today);
    const data: StreakData = JSON.parse(raw);
    return recalculate(solved, today);
  } catch {
    return defaultStreak();
  }
}

export function loadSolvedDates(): DailySolvedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SOLVED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markSolved(date: string, difficulty: Difficulty, hintsUsed: number): StreakData {
  const solved = loadSolvedDates();
  const exists = solved.find(e => e.date === date && e.difficulty === difficulty);
  if (!exists) {
    solved.push({ date, difficulty, hintsUsed });
    localStorage.setItem(SOLVED_KEY, JSON.stringify(solved));
  }
  const streak = recalculate(solved, date);
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak;
}

function recalculate(solved: DailySolvedEntry[], today: string): StreakData {
  const uniqueDates = [...new Set(solved.map(e => e.date))].sort();
  let current = 0;
  let best = 0;
  let streak = 0;

  for (let i = uniqueDates.length - 1; i >= 0; i--) {
    const expected = offsetDate(today, -(uniqueDates.length - 1 - i));
    if (uniqueDates[i] === expected) {
      streak++;
      if (i === uniqueDates.length - 1 && uniqueDates[i] !== today) {
        // last solved was yesterday - streak still counts
      }
    } else {
      break;
    }
  }

  // Check if today is solved
  const todaySolved = solved.find(e => e.date === today);
  const yesterdayStr = offsetDate(today, -1);
  const yesterdaySolved = solved.find(e => e.date === yesterdayStr);

  if (todaySolved) {
    // Rebuild correct streak from today backward
    current = buildStreak(uniqueDates, today);
  } else if (yesterdaySolved) {
    current = buildStreak(uniqueDates, yesterdayStr);
  } else {
    current = 0;
  }

  best = Math.max(...uniqueDates.map((_, i) => buildStreak(uniqueDates, uniqueDates[i])), current, 0);

  const progressState: ProgressState = todaySolved ? 'solved' : 'unsolved';
  const solvedDifficulty = todaySolved ? todaySolved.difficulty : null;

  return {
    currentStreak: current,
    bestStreak: best,
    lastSolvedDate: uniqueDates[uniqueDates.length - 1] ?? null,
    totalSolved: uniqueDates.length,
    solvedDates: solved,
    progressState,
    solvedDifficulty,
  };
}

function buildStreak(dates: string[], from: string): number {
  let count = 0;
  let cursor = from;
  while (dates.includes(cursor)) {
    count++;
    cursor = offsetDate(cursor, -1);
  }
  return count;
}

function offsetDate(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultStreak(): StreakData {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastSolvedDate: null,
    totalSolved: 0,
    solvedDates: [],
    progressState: 'unsolved',
    solvedDifficulty: null,
  };
}
