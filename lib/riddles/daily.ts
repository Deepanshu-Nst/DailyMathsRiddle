import { getDailyRiddle } from '@/lib/riddles/queries';
import { runGenerationPipeline } from '@/lib/generation/pipeline';
import { withLock } from '@/lib/generation/concurrency';
import type { DbRiddle } from '@/types/supabase';
import type { Riddle } from '@/types';

/**
 * Retrieves the daily riddle for a given date + difficulty.
 *
 * Priority:
 * 1. DB lookup — if row exists, return it (zero generation cost)
 * 2. Generation pipeline — if not found, generate + save to DB
 * 3. Riddle bank fallback — ONLY for backwards compat with /riddle/[date]
 *    when DB is unavailable (e.g. service role key not yet set)
 *
 * The lock on `daily:${date}:${difficulty}` prevents concurrent
 * generation requests for the same daily slot from spawning
 * multiple Groq calls. The DB unique index on (daily_date, difficulty)
 * provides an additional distributed guard.
 */
export async function getDailyRiddleOrGenerate(
  date: string,
  difficulty: string
): Promise<DbRiddle | null> {
  // 1. Check DB first — cheap, no AI cost
  const existing = await getDailyRiddle(date, difficulty);
  if (existing) return existing;

  // 2. Generate under lock — prevents double-generation
  const lockKey = `daily:${date}:${difficulty}`;
  const result = await withLock(lockKey, () =>
    runGenerationPipeline({
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      isDaily: true,
      dailyDate: date,
    })
  );

  if (result.success) return result.riddle;

  // 3. Fallback: return null — caller decides whether to use riddle bank
  console.error('[daily] Generation pipeline failed:', result.error);
  return null;
}

/**
 * Full-stack daily riddle retrieval for the challenge API.
 * Returns either a DB-persisted riddle or a riddle-bank fallback.
 * The returned Riddle includes answer + variants (for server-side use).
 */
export async function getActiveRiddleForServer(
  date: string,
  difficulty: string
): Promise<Riddle & { slug?: string; riddleId?: string }> {
  const dbRiddle = await getDailyRiddleOrGenerate(date, difficulty);

  if (dbRiddle) {
    return {
      id: dbRiddle.id,
      slug: dbRiddle.slug,
      riddleId: dbRiddle.id,
      question: dbRiddle.question,
      answer: dbRiddle.answer,
      answerVariants: dbRiddle.answer_variants ?? [],
      hint1: dbRiddle.hint1,
      hint2: dbRiddle.hint2,
      explanation: dbRiddle.explanation,
      difficulty: dbRiddle.difficulty as Riddle['difficulty'],
      category: dbRiddle.category,
    };
  }
  // If we reach here, both DB and Generation failed. We do not fallback.
  console.warn('[daily] Generation pipeline failed, no riddle bank fallback available for', date, difficulty);
  throw new Error(`Failed to retrieve or generate riddle for ${date} (${difficulty})`);
}
