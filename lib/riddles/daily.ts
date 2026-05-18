import { getSlotRiddle } from '@/lib/riddles/slots';
import { publishToSlot } from '@/lib/riddles/slots';
import { getScheduledRiddle, insertRiddle } from '@/lib/riddles/queries';
import { runGenerationPipeline } from '@/lib/generation/pipeline';
import { withLock } from '@/lib/generation/concurrency';
import type { DbRiddle } from '@/types/supabase';
import type { Riddle } from '@/types';
import { slugify } from '@/utils/slugify';

/**
 * Retrieves the daily riddle for a given date + difficulty.
 *
 * Resolution order (from the slot table):
 * 1. Existing slot (manual or AI) — already published
 * 2. Scheduled riddle (admin pre-set) — promote to slot
 * 3. AI generation pipeline — create + slot
 * 4. Fail loudly
 *
 * CRITICAL: The website resolves from daily_riddle_slots ONLY.
 * Riddle records are never mutated. The slot table decides what is live.
 */
export async function getDailyRiddleOrGenerate(
  date: string,
  difficulty: string
): Promise<DbRiddle | null> {
  // ── 1. Check slot table first (authoritative source) ──
  const slotRiddle = await getSlotRiddle(date, difficulty);
  if (slotRiddle) {
    console.log(`[daily] Resolved from slot: ${slotRiddle.slot_source}:${slotRiddle.id} for ${date}/${difficulty}`);
    return slotRiddle;
  }

  // ── 2. Check for scheduled riddle (admin editorial override) ──
  const scheduled = await getScheduledRiddle(date, difficulty);
  if (scheduled) {
    console.log(`[daily] Found scheduled riddle for ${date}/${difficulty}. Promoting to slot.`);

    // Create riddle record (immutable)
    const promoted = await insertRiddle({
      question: scheduled.question,
      answer: scheduled.answer,
      explanation: scheduled.explanation,
      difficulty: scheduled.difficulty,
      is_daily: false,
      daily_date: date,
      status: 'published',
      slug: slugify(scheduled.question.slice(0, 50)) + '-' + Date.now().toString(36),
      source_type: 'admin',
      category: 'Editorial',
    });

    if (promoted) {
      // Publish to slot as manual/scheduled
      await publishToSlot({
        date,
        difficulty,
        riddleId: promoted.id,
        sourceType: 'scheduled',
        isManual: true,
        publishedBy: scheduled.created_by ?? null,
      });

      console.log(`[daily] Scheduled riddle promoted: ${promoted.id}`);
      return promoted;
    }
  }

  // ── 3. AI generation fallback (under lock) ──
  console.log(`[daily] No slot or schedule for ${date}/${difficulty}. Running AI generation.`);
  const lockKey = `daily:${date}:${difficulty}`;
  const result = await withLock(lockKey, () =>
    runGenerationPipeline({
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      isDaily: true,
      dailyDate: date,
    })
  );

  if (result.success) {
    // Publish to slot as AI
    await publishToSlot({
      date,
      difficulty,
      riddleId: result.riddle.id,
      sourceType: 'ai',
      isManual: false,
    });

    console.log(`[daily] AI riddle slotted: ${result.riddle.id}`);
    return result.riddle;
  }

  // ── 4. Fail loudly ──
  console.error(`[daily] ALL resolution paths failed for ${date}/${difficulty}`);
  return null;
}

/**
 * Full-stack daily riddle retrieval for the challenge API.
 * Returns either a slot-resolved riddle or throws.
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

  console.error(`[daily] FATAL: No riddle available for ${date} (${difficulty})`);
  throw new Error(`Failed to retrieve or generate riddle for ${date} (${difficulty})`);
}
