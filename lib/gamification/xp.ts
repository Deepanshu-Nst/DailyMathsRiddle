import type { Difficulty } from '@/types';
import type { XPBonus } from '@/types/gamification';

/** Base XP per difficulty. */
export const XP_TABLE: Record<Difficulty, number> = {
  easy:   10,
  medium: 25,
  hard:   50,
};

/** Bonus XP amounts. */
export const BONUS_FIRST_TRY  = 15;
export const BONUS_FAST_SOLVE = 10; // awarded if solve time < 60s
export const FAST_SOLVE_THRESHOLD_S = 60;

/** Streak values at which a milestone bonus fires. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
export const MILESTONE_BONUS = 25;

/** XP awarded when a user gives up (reduced award). */
export const XP_GIVE_UP = 5;

/**
 * Calculates the full XP breakdown for a solve event.
 * Pure — does not touch the DB.
 */
export function calculateXP(opts: {
  difficulty: Difficulty;
  attemptCount: number;
  solveTimeSeconds: number | null;
  newStreak: number;
}): { base: number; bonuses: XPBonus[]; total: number } {
  const base = XP_TABLE[opts.difficulty];
  const bonuses: XPBonus[] = [];

  if (opts.attemptCount === 1) {
    bonuses.push({ reason: 'first_try_bonus', amount: BONUS_FIRST_TRY });
  }

  if (opts.solveTimeSeconds !== null && opts.solveTimeSeconds < FAST_SOLVE_THRESHOLD_S) {
    bonuses.push({ reason: 'fast_solve_bonus', amount: BONUS_FAST_SOLVE });
  }

  if (STREAK_MILESTONES.includes(opts.newStreak)) {
    bonuses.push({
      reason: `streak_milestone_${opts.newStreak}`,
      amount: MILESTONE_BONUS,
    });
  }

  const total = base + bonuses.reduce((s, b) => s + b.amount, 0);
  return { base, bonuses, total };
}

/**
 * Persists XP events and increments user_stats.total_xp.
 * Uses service client to bypass RLS.
 * Non-throwing — XP failures should not block the solve response.
 */
export async function awardXP(opts: {
  userId: string;
  base: number;
  bonuses: XPBonus[];
  riddleId: string | null;
}): Promise<void> {
  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  // 1. Anti-abuse: Check if base XP already awarded for this riddle
  if (opts.riddleId) {
    const { data: existing } = await supabase
      .from('xp_events')
      .select('id')
      .eq('user_id', opts.userId)
      .eq('riddle_id', opts.riddleId)
      .eq('reason', 'solve_base')
      .maybeSingle();
    
    if (existing) {
      console.warn(`[XP ABUSE PREVENTED] User ${opts.userId} already received XP for riddle ${opts.riddleId}`);
      return;
    }
  }

  const events = [
    { user_id: opts.userId, amount: opts.base, reason: 'solve_base', riddle_id: opts.riddleId },
    ...opts.bonuses.map(b => ({
      user_id: opts.userId,
      amount: b.amount,
      reason: b.reason,
      riddle_id: opts.riddleId,
    })),
  ];

  const totalXP = opts.base + opts.bonuses.reduce((s, b) => s + b.amount, 0);

  // Insert all XP events
  const { error: evtErr } = await supabase.from('xp_events').insert(events);
  if (evtErr) console.error('[XP AWARDED] insert error:', evtErr.message);
  else console.log(`[XP AWARDED] +${totalXP} XP (base ${opts.base} + ${opts.bonuses.length} bonuses)`);

  // Increment total_xp in user_stats (upsert handled by processSolve)
  // XP stat increment handled atomically by processSolve's user_stats upsert
}

/**
 * Recalculates a user's total XP from the immutable xp_events log.
 * Useful for auditing or restoring state after invalidations.
 */
export async function recalculateTotalXP(userId: string): Promise<number> {
  try {
    const { createServiceClient } = await import('@/utils/supabase/server');
    const supabase = (await createServiceClient()) as any;
    
    const { data: events } = await supabase
      .from('xp_events')
      .select('amount')
      .eq('user_id', userId);

    const newTotal = (events || []).reduce((acc: number, e: { amount: number }) => acc + e.amount, 0);
    
    await supabase
      .from('user_stats')
      .update({ total_xp: newTotal })
      .eq('user_id', userId);

    console.log(`[XP RECALCULATED] User ${userId}: ${newTotal} XP`);
    return newTotal;
  } catch (err) {
    console.error('[XP RECALCULATED ERROR]', err);
    return 0;
  }
}
