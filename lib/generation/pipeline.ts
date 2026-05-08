import { generateRiddlesBatch } from '@/lib/ai/generator';
import { validateRiddle } from '@/lib/ai/validator';
import { runStructuralChecks } from '@/lib/validation/structuralChecks';
import { checkDuplication } from '@/lib/validation/duplication';
import { insertRiddle, insertGenerationLog } from '@/lib/riddles/queries';
import { generateSlug } from '@/lib/riddles/slugify';
import type { AIRiddle, ValidationResult } from '@/types/ai';
import type { DbRiddle } from '@/types/supabase';

const MAX_RETRIES = 2;
const BATCH_SIZE = 5;

export interface PipelineOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  isDaily?: boolean;
  dailyDate?: string;
  createdBy?: string | null;
  sessionId?: string | null;
}

export interface PipelineResult {
  success: true;
  riddle: DbRiddle;
}

export interface PipelineFailure {
  success: false;
  error: string;
  retryable: boolean;
}

/**
 * The full riddle generation + validation + DB-save pipeline.
 *
 * Flow (per attempt, up to MAX_RETRIES+1 times):
 * 1. generateRiddlesBatch()    — Groq API, returns N candidates
 * 2. runStructuralChecks()     — instant, no API
 * 3. validateRiddle()          — Groq API, AI scorer
 * 4. checkDuplication()        — Supabase query
 * 5. Score and select best
 * 6. insertRiddle()            — Supabase INSERT
 * 7. insertGenerationLog()     — audit trail
 *
 * On all retries exhausted: returns PipelineFailure.
 * NEVER silently returns a fallback riddle.
 *
 * Frontend state must NOT be updated until this returns PipelineResult.
 */
export async function runGenerationPipeline(
  opts: PipelineOptions
): Promise<PipelineResult | PipelineFailure> {
  const { difficulty, isDaily = false, dailyDate = null, createdBy = null, sessionId = null } = opts;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[pipeline] Attempt ${attempt + 1}/${MAX_RETRIES + 1} — difficulty: ${difficulty}`);

    // ── Step 1: Generate batch ──────────────────────────────────
    let candidates: Partial<AIRiddle>[];
    try {
      candidates = await generateRiddlesBatch(difficulty, BATCH_SIZE);
    } catch (err) {
      console.error(`[pipeline] Batch generation failed on attempt ${attempt + 1}:`, err);
      if (attempt === MAX_RETRIES) {
        return { success: false, error: 'AI generation unavailable. Please try again.', retryable: true };
      }
      continue;
    }

    // ── Steps 2–4: Validate each candidate ───────────────────────
    const scored: Array<{ riddle: Partial<AIRiddle>; validation: ValidationResult; score: number }> = [];

    // Run AI validation in parallel for the whole batch
    const validations = await Promise.all(
      candidates.map((r) =>
        validateRiddle(r).catch((err) => {
          console.warn('[pipeline] AI validation call failed:', err);
          return null;
        })
      )
    );

    for (let i = 0; i < candidates.length; i++) {
      const riddle = candidates[i];
      const validation = validations[i];

      if (!validation) continue;

      // 2. Structural checks (instant)
      const structural = runStructuralChecks(riddle);
      if (!structural.passed) {
        console.debug(`[pipeline] Structural rejected: ${structural.reason}`);
        continue;
      }

      // 3. AI validator thresholds
      if (!validation.is_valid || validation.correctness_confidence < 0.75 || validation.final_score < 6) {
        console.debug(`[pipeline] AI validator rejected: conf=${validation.correctness_confidence} score=${validation.final_score} issues=${validation.issues.join('; ')}`);
        continue;
      }

      // 4. DB deduplication
      const dedup = await checkDuplication(riddle.question ?? '');
      if (!dedup.passed) {
        console.debug(`[pipeline] Dedupe rejected: ${dedup.reason}`);
        continue;
      }

      // Compute composite score
      const score =
        0.4 * validation.final_score +
        0.3 * validation.reasoning_depth_score +
        0.2 * validation.clarity_score +
        0.1 * validation.originality_score;

      scored.push({ riddle, validation, score });
    }

    if (scored.length === 0) {
      console.log(`[pipeline] No candidates passed all checks on attempt ${attempt + 1}`);
      continue;
    }

    // ── Step 5: Select best ───────────────────────────────────────
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // ── Step 6: Save to DB ────────────────────────────────────────
    const slug = generateSlug(best.riddle.question ?? '');

    const saved = await insertRiddle({
      slug,
      question: best.riddle.question!,
      answer: best.riddle.answer!,
      answer_variants: (best.riddle.answerVariants ?? []) as string[],
      hint1: best.riddle.hint1 ?? '',
      hint2: best.riddle.hint2 ?? '',
      explanation: best.riddle.explanation!,
      difficulty,
      category: best.riddle.category ?? '',
      source_type: 'ai',
      is_daily: isDaily,
      daily_date: dailyDate,
      status: 'published',
      created_by: createdBy,
      validation_score: best.score,
      generator_model: best.riddle.generator_model ?? 'llama-3.3-70b-versatile',
    });

    if (!saved) {
      console.error('[pipeline] DB insert failed — riddle not saved');
      if (attempt === MAX_RETRIES) {
        return { success: false, error: 'Failed to save riddle. Please try again.', retryable: true };
      }
      continue;
    }

    // ── Step 7: Log generation ────────────────────────────────────
    await insertGenerationLog({
      userId: createdBy,
      sessionId,
      riddleId: saved.id,
      difficulty,
    });

    console.log(`[pipeline] Saved riddle id=${saved.id} slug=${saved.slug} score=${best.score.toFixed(2)}`);
    return { success: true, riddle: saved };
  }

  return {
    success: false,
    error: 'Could not generate a valid riddle after multiple attempts. Please try again later.',
    retryable: true,
  };
}
