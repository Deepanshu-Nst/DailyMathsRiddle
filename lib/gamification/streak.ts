/**
 * Server-side streak engine.
 * All date math is UTC-safe.
 * Never reads from localStorage.
 */

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface StreakProcessResult {
  newStreak: number;
  bestStreak: number;
  wasReset: boolean;
  isMilestone: boolean;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

/**
 * Processes a solve event for the given user and date.
 * Reads and writes user_stats + streak_events tables.
 *
 * Returns the new streak value (or 0 if it couldn't be determined).
 */
export async function processStreak(
  userId: string,
  solvedDate: string = todayUTC()
): Promise<StreakProcessResult> {
  const { createServiceClient } = await import('@/lib/supabase/server');
  const supabase = (await createServiceClient()) as any;

  // Fetch current stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('current_streak, best_streak, last_solved_date')
    .eq('user_id', userId)
    .single();

  const lastSolved: string | null = stats?.last_solved_date ?? null;
  const currentStreak: number = stats?.current_streak ?? 0;
  const bestStreak: number = stats?.best_streak ?? 0;

  let newStreak: number;
  let eventType: 'increment' | 'reset';
  let wasReset = false;

  if (lastSolved === solvedDate) {
    // Already recorded today — no-op, return current state
    console.log('[STREAK] already recorded for', solvedDate);
    return {
      newStreak: currentStreak,
      bestStreak,
      wasReset: false,
      isMilestone: false,
    };
  }

  if (lastSolved === yesterdayUTC() || lastSolved === null && currentStreak === 0) {
    // Consecutive day (or first solve ever)
    newStreak = currentStreak + 1;
    eventType = 'increment';
    console.log(`[STREAK INCREMENT] ${currentStreak} → ${newStreak}`);
  } else {
    // Gap detected — streak broken
    newStreak = 1;
    eventType = 'reset';
    wasReset = true;
    console.log(`[STREAK RESET] was ${currentStreak}, restarting at 1`);
  }

  const newBest = Math.max(bestStreak, newStreak);
  const isMilestone = STREAK_MILESTONES.includes(newStreak);

  // Insert streak event
  await supabase.from('streak_events').insert({
    user_id: userId,
    event_type: eventType,
    streak_value: newStreak,
    solved_date: solvedDate,
  });

  return { newStreak, bestStreak: newBest, wasReset, isMilestone };
}
