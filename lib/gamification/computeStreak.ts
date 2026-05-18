/**
 * Streak computation from solved dates.
 *
 * The source of truth for streaks is: distinct solved IST dates
 * from user_attempts WHERE status='solved'.
 *
 * user_stats.current_streak is treated as an optimization cache,
 * NOT the source of truth.
 */

import { getOfficialDailyDate, toOfficialDateFromInstant, addOfficialCalendarDays } from '@/lib/timezone';

export interface ComputedStreak {
  currentStreak: number;
  bestStreak: number;
  /** All distinct IST dates when the user solved (sorted descending) */
  solvedDates: string[];
  /** Whether today is solved */
  todaySolved: boolean;
}

/**
 * Computes the current and best streak from a list of solved ISO timestamps.
 * Converts each timestamp to IST date, deduplicates, then walks backwards
 * from today counting consecutive days.
 *
 * This is the CANONICAL streak computation.
 * Call this instead of trusting user_stats.current_streak.
 */
export function computeStreakFromDates(
  solvedTimestamps: string[],
  today?: string
): ComputedStreak {
  const todayIST = today ?? getOfficialDailyDate();

  // Convert all timestamps to IST dates and deduplicate
  const dateSet = new Set<string>();
  for (const ts of solvedTimestamps) {
    dateSet.add(toOfficialDateFromInstant(ts));
  }

  const solvedDates = Array.from(dateSet).sort().reverse(); // newest first

  if (solvedDates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, solvedDates: [], todaySolved: false };
  }

  const todaySolved = dateSet.has(todayIST);

  // Sort ascending for streak computation
  const sortedAsc = Array.from(dateSet).sort();

  // Compute current streak: walk backwards from today
  let currentStreak = 0;
  let checkDate = todayIST;

  // If today isn't solved, start checking from yesterday
  if (!todaySolved) {
    const yesterday = addOfficialCalendarDays(todayIST, -1);
    if (!dateSet.has(yesterday)) {
      // Neither today nor yesterday solved — streak is broken
      currentStreak = 0;
    } else {
      // Yesterday was solved, count backwards from yesterday
      checkDate = yesterday;
      while (dateSet.has(checkDate)) {
        currentStreak++;
        checkDate = addOfficialCalendarDays(checkDate, -1);
      }
    }
  } else {
    // Today is solved, count backwards from today
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = addOfficialCalendarDays(checkDate, -1);
    }
  }

  // Compute best streak ever
  let bestStreak = 0;
  let runningStreak = 1;

  for (let i = 1; i < sortedAsc.length; i++) {
    const expected = addOfficialCalendarDays(sortedAsc[i - 1], 1);
    if (sortedAsc[i] === expected) {
      runningStreak++;
    } else {
      bestStreak = Math.max(bestStreak, runningStreak);
      runningStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, runningStreak);

  // Current streak should also be considered for best
  bestStreak = Math.max(bestStreak, currentStreak);

  return {
    currentStreak,
    bestStreak,
    solvedDates,
    todaySolved,
  };
}
