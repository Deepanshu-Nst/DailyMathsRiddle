import { getDailyRiddle, getScheduledRiddle, insertRiddle } from '@/lib/riddles/queries';
import { runGenerationPipeline } from '@/lib/generation/pipeline';
import { withLock } from '@/lib/generation/concurrency';
import type { DbRiddle } from '@/types/supabase';
import type { Riddle } from '@/types';
import { slugify } from '@/utils/slugify';

/**
 * Retrieves the daily riddle for a given date + difficulty.
 *
 * Priority:
 * 1. DB lookup (riddles table) — already served/generated.
 * 2. Scheduled Override — if an admin pre-scheduled a riddle for today.
 * 3. Generation pipeline — fallback if nothing is pre-set.
 */
export async function getDailyRiddleOrGenerate(
  date: string,
  difficulty: string
): Promise<DbRiddle | null> {
  // 1. Check live DB first
  const existing = await getDailyRiddle(date, difficulty);
  if (existing) return existing;

  // 2. Check for Scheduled Riddles (Editorial Override)
  const scheduled = await getScheduledRiddle(date, difficulty);
  if (scheduled) {
    console.log(`[SCHEDULED RIDDLE SERVED] Date: ${date}, Difficulty: ${difficulty}`);
    
    // Promote scheduled riddle to live riddles table
    const promoted = await insertRiddle({
      question: scheduled.question,
      answer: scheduled.answer,
      explanation: scheduled.explanation,
      difficulty: scheduled.difficulty,
      is_daily: true,
      daily_date: date,
      status: 'published',
      slug: slugify(scheduled.question.slice(0, 50)) + '-' + Date.now().toString(36),
      source_type: 'admin',
      category: 'Editorial'
    });

    if (promoted) {
      console.log(`[RIDDLE MANUALLY OVERRIDDEN] Promoted ID: ${promoted.id}`);
      return promoted;
    }
  }

  // 3. Fallback to AI Generation under lock
  console.log(`[AI FALLBACK USED] Date: ${date}, Difficulty: ${difficulty}`);
  const lockKey = `daily:${date}:${difficulty}`;
  const result = await withLock(lockKey, () =>
    runGenerationPipeline({
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      isDaily: true,
      dailyDate: date,
    })
  );

  if (result.success) return result.riddle;

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
