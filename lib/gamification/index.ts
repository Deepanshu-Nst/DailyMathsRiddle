/**
 * processSolve — the central gamification orchestrator.
 *
 * Called after a correct answer is confirmed server-side.
 * Handles: streak processing, XP calculation, user_stats upsert.
 *
 * Non-throwing — all errors are logged and a partial result is returned.
 */

import type { Difficulty } from '@/types';
import type { SolveResult } from '@/types/gamification';
import { getOfficialDailyDate } from '@/lib/timezone';
import { processStreak } from './streak';
import { calculateXP } from './xp';

export interface ProcessSolveOpts {
  userId: string;
  difficulty: Difficulty;
  riddleId: string | null;
  /** ISO timestamp of when the user first saw the riddle. */
  solveStartedAt: string | null;
  /** Total number of answer submissions (including this final correct one). */
  attemptCount: number;
  hintsUsed: number;
  /** Official calendar date (NEXT_PUBLIC_DAILY_TIMEZONE, default IST). */
  solvedDate?: string;
}

export async function processSolve(opts: ProcessSolveOpts): Promise<SolveResult> {
  const { userId, difficulty, riddleId, solveStartedAt, attemptCount, hintsUsed } = opts;
  const solvedDate = opts.solvedDate ?? getOfficialDailyDate();

  // Calculate solve duration
  let solveTimeSeconds: number | null = null;
  if (solveStartedAt) {
    const elapsed = (Date.now() - new Date(solveStartedAt).getTime()) / 1000;
    solveTimeSeconds = Math.round(elapsed);
    console.log(`[SOLVE DURATION] ${solveTimeSeconds}s`);
  }

  // 1. Process streak
  const { newStreak, bestStreak, wasReset, isMilestone } = await processStreak(userId, solvedDate);

  // 2. Calculate XP
  const { base, bonuses, total: xpTotal } = calculateXP({
    difficulty,
    attemptCount,
    solveTimeSeconds,
    newStreak,
  });

  // 3. Insert XP events
  try {
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = (await createServiceClient()) as any;

    const xpEvents = [
      { user_id: userId, amount: base, reason: `solve_${difficulty}`, riddle_id: riddleId },
      ...bonuses.map(b => ({ user_id: userId, amount: b.amount, reason: b.reason, riddle_id: riddleId })),
    ];
    const { error: xpErr } = await supabase.from('xp_events').insert(xpEvents);
    if (xpErr) console.error('[XP AWARDED] insert error:', xpErr.message);
    else console.log(`[XP AWARDED] +${xpTotal} XP for user ${userId.slice(0, 8)}…`);

    // 4. Upsert user_stats — one atomic operation
    const diffColumn = `${difficulty}_solved` as const;
    const { data: existing } = await supabase
      .from('user_stats')
      .select('total_xp, riddles_solved, easy_solved, medium_solved, hard_solved, total_attempts, correct_attempts')
      .eq('user_id', userId)
      .single();

    const prev = existing ?? {
      total_xp: 0, riddles_solved: 0,
      easy_solved: 0, medium_solved: 0, hard_solved: 0,
      total_attempts: 0, correct_attempts: 0,
    };

    const statsUpdate = {
      user_id: userId,
      total_xp: (prev.total_xp ?? 0) + xpTotal,
      current_streak: newStreak,
      best_streak: bestStreak,
      riddles_solved: (prev.riddles_solved ?? 0) + 1,
      easy_solved:   (prev.easy_solved ?? 0)   + (difficulty === 'easy'   ? 1 : 0),
      medium_solved: (prev.medium_solved ?? 0) + (difficulty === 'medium' ? 1 : 0),
      hard_solved:   (prev.hard_solved ?? 0)   + (difficulty === 'hard'   ? 1 : 0),
      total_attempts:   (prev.total_attempts ?? 0)   + attemptCount,
      correct_attempts: (prev.correct_attempts ?? 0) + 1,
      last_solved_date: solvedDate,
    };

    const { error: statsErr } = await supabase
      .from('user_stats')
      .upsert(statsUpdate, { onConflict: 'user_id' });

    if (statsErr) console.error('[STATS RECALCULATION] upsert error:', statsErr.message);
    else console.log('[STATS RECALCULATION] user_stats updated for', userId.slice(0, 8) + '…');

    // 5. Check for achievement unlocks
    const { checkAndUnlockAchievements } = await import('./achievements');
    const newlyUnlocked = await checkAndUnlockAchievements(userId, statsUpdate as any);

    return {
      xpAwarded: xpTotal,
      newStreak,
      wasStreakReset: wasReset,
      isStreakMilestone: isMilestone,
      bonuses,
      newlyUnlockedAchievements: newlyUnlocked,
    };

  } catch (err) {
    console.error('[processSolve] unexpected error:', err);
  }

  return {
    xpAwarded: xpTotal,
    newStreak,
    wasStreakReset: wasReset,
    isStreakMilestone: isMilestone,
    bonuses,
  };
}
