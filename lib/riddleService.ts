import { getActiveRiddleForServer } from './riddles/daily';
import type { Riddle } from '@/types';

/**
 * riddleService.ts — updated for Phase 2.
 *
 * Previously: JSON file store → riddle bank fallback.
 * Now: delegates to lib/riddles/daily.ts (DB-first pipeline).
 *
 * This file is kept for backwards compatibility.
 * The /api/challenge and /api/validate routes import from here.
 */
export async function getActiveRiddle(
  date: string,
  difficulty: string
): Promise<Riddle & { slug?: string; riddleId?: string }> {
  return getActiveRiddleForServer(date, difficulty);
}
