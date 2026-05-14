import type { Difficulty } from './index';

/** Full user stats row from the DB. */
export interface UserStats {
  user_id: string;
  total_xp: number;
  current_streak: number;
  best_streak: number;
  riddles_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_attempts: number;
  correct_attempts: number;
  last_solved_date: string | null;
  updated_at: string;
}

/** Result returned from processSolve after a correct answer. */
export interface SolveResult {
  xpAwarded: number;
  newStreak: number;
  wasStreakReset: boolean;
  isStreakMilestone: boolean;
  bonuses: XPBonus[];
}

export interface XPBonus {
  reason: string;
  amount: number;
}

/** Possible XP award reasons. */
export type XPReason =
  | 'solve_easy'
  | 'solve_medium'
  | 'solve_hard'
  | 'first_try_bonus'
  | 'fast_solve_bonus'
  | `streak_milestone_${number}`;
