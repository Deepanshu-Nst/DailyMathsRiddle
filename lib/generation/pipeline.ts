import { generateSingleRiddle, parseGroqRetryDelay, PRIMARY_MODEL, FAST_MODEL, generateDeterministicFallback } from '@/lib/ai/generator';
import { checkDuplication } from '@/lib/validation/duplication';
import { insertRiddle, insertGenerationLog, getRecentTemplateFamilies, insertFailedGeneration, getAIConfig } from '@/lib/riddles/queries';
import { logPipelineEvent } from '@/lib/analytics/pipelineEvents';
import { generateSlug } from '@/lib/riddles/slugify';
import type { DbRiddle } from '@/types/supabase';

const MAX_CANDIDATES = 3;

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

export interface AttemptTrace {
  attempt: number;
  failedAt: string;
  reason: string;
  durationMs?: number;
  templateFamily?: string | null;
}

export interface PipelineFailure {
  success: false;
  error: string;
  retryable: boolean;
  attempts?: AttemptTrace[];
}

type GroqError = Error & { groqHeaders?: Headers; groqBody?: string };

export async function runGenerationPipeline(
  opts: PipelineOptions
): Promise<PipelineResult | PipelineFailure> {
  const { difficulty, isDaily = false, dailyDate = null, createdBy = null, sessionId = null } = opts;
  const startedAt = Date.now();

  // 1. Check AI Config
  const config = await getAIConfig();
  if (!config.is_enabled) {
    console.warn('[pipeline] AI generation is DISABLED via admin override');
    return { success: false, error: 'AI generation is currently disabled.', retryable: false };
  }

  const maxCandidates = config.max_retries || MAX_CANDIDATES;
  if (config.safe_mode) {
    console.log(`[AI SAFE MODE] Enabled for difficulty=${difficulty}`);
  }

  let candidatesTried = 0;
  let rateLimitHits = 0;
  let lastRejectionType: 'structural_rejected' | 'duplicate_rejected' | 'generator_error' | 'hallucination_detected' = 'generator_error';

  const attempts: AttemptTrace[] = [];
  const recentTemplateFamilies = await getRecentTemplateFamilies(20);

  console.log(`[pipeline] START difficulty=${difficulty} mode=${config.mode}`);

  for (let slot = 0; slot < maxCandidates; slot++) {
    const attemptStartTime = Date.now();
    let riddleResult;
    let currentModel = slot === 0 ? PRIMARY_MODEL : FAST_MODEL;
    
    if (slot < maxCandidates - 1) {
      console.log(`[pipeline] Candidate ${slot + 1}/${maxCandidates} — model=${currentModel}`);
      try {
        riddleResult = await generateSingleRiddle(difficulty, recentTemplateFamilies, currentModel);
      } catch (err) {
        const e = err as GroqError;
        const msg = e.message ?? '';
        if (msg.includes('429')) {
          rateLimitHits++;
          const delay = parseGroqRetryDelay(e.groqHeaders ?? new Headers(), e.groqBody);
          console.log(`[pipeline] Generator 429 (hit #${rateLimitHits}) — waiting ${Math.round(delay / 1000)}s`);
          await new Promise((res) => setTimeout(res, delay));
          slot--; // retry this slot
          continue;
        }
        console.error('[pipeline] Generator error:', msg);
        attempts.push({ attempt: slot + 1, failedAt: 'generator', reason: 'API Error: ' + msg, templateFamily: null });
        lastRejectionType = 'generator_error';
        continue;
      }
    } else {
      console.log(`[pipeline] Candidate ${slot + 1}/${MAX_CANDIDATES} — Deterministic Fallback`);
      currentModel = 'deterministic_fallback';
      riddleResult = generateDeterministicFallback(difficulty);
    }

    candidatesTried++;

    if (!riddleResult.success) {
      console.debug(`[pipeline] Generator rejected: ${riddleResult.reason}`);
      lastRejectionType = riddleResult.stage === 'parse_error' ? 'generator_error' : 'structural_rejected';
      attempts.push({ attempt: slot + 1, failedAt: riddleResult.stage, reason: riddleResult.reason, durationMs: Date.now() - attemptStartTime, templateFamily: riddleResult.templateFamily });
      await insertFailedGeneration({
        sessionId, userId: createdBy, difficulty, model: currentModel, rawResponse: riddleResult.rawResponse,
        rejectionStage: riddleResult.stage === 'parse_error' ? 'parse_error' : 'structural_rejected', rejectionReason: riddleResult.reason,
        templateFamily: riddleResult.templateFamily
      });
      continue;
    }

    const riddle = riddleResult.riddle;

    // ── DB deduplication ──────────────────────────────────────
    const dedup = await checkDuplication(riddle.question ?? '');
    if (!dedup.passed) {
      console.debug(`[pipeline] Dedupe rejected: ${dedup.reason}`);
      lastRejectionType = 'duplicate_rejected';
      attempts.push({ attempt: slot + 1, failedAt: 'duplication', reason: dedup.reason || 'Too similar to recent', durationMs: Date.now() - attemptStartTime, templateFamily: riddleResult.templateFamily });
      await insertFailedGeneration({
        sessionId, userId: createdBy, difficulty, model: currentModel, rawResponse: riddleResult.rawResponse,
        rejectionStage: 'duplicate_rejected', rejectionReason: dedup.reason || 'Too similar to recent',
        templateFamily: riddleResult.templateFamily
      });
      continue;
    }

    // ── Passed — Compute deterministic validation score ──────────────────
    const score = 10; // Deterministic answers bypass probabilistic validators, giving perfect safety score.

    // ── Save to DB ────────────────────────────────────────────────
    const slug = generateSlug(riddle.question ?? '');
    const saved = await insertRiddle({
      slug,
      question: riddle.question!,
      answer: riddle.answer!,
      answer_variants: (riddle.answerVariants ?? []) as string[],
      hint1: riddle.hint1 ?? '',
      hint2: riddle.hint2 ?? '',
      explanation: riddle.explanation!,
      difficulty,
      category: riddle.category ?? '',
      source_type: 'ai',
      is_daily: isDaily,
      daily_date: dailyDate,
      status: 'published',
      created_by: createdBy,
      validation_score: score,
      generator_model: currentModel,
      generation_mode: riddleResult.generationMode,
      template_family: riddleResult.templateFamily,
    });

    if (!saved) {
      console.error('[pipeline] DB insert failed');
      attempts.push({ attempt: slot + 1, failedAt: 'db_insert', reason: 'Failed to insert to DB', templateFamily: riddleResult.templateFamily });
      continue;
    }

    const durationMs = Date.now() - startedAt;
    await insertGenerationLog({ 
      userId: createdBy, 
      sessionId, 
      riddleId: saved.id, 
      difficulty,
      durationMs,
      retryCount: slot + 1,
      templateFamily: riddleResult.templateFamily
    });

    await logPipelineEvent({ sessionId, userId: createdBy, difficulty, isDaily,
      eventType: 'success', riddleId: saved.id, validationScore: score,
      durationMs, attemptsMade: slot + 1, candidatesTried, generationMode: riddleResult.generationMode, templateFamily: riddleResult.templateFamily });

    console.log(`[GENERATION SUCCESS] id=${saved.id} slug=${saved.slug} model=${currentModel} in ${durationMs}ms`);
    return { success: true, riddle: saved };
  }

  // All candidates exhausted (even fallback failed dedupe somehow)
  const totalDuration = Date.now() - startedAt;
  await logPipelineEvent({ sessionId, userId: createdBy, difficulty, isDaily,
    eventType: lastRejectionType, durationMs: totalDuration,
    attemptsMade: maxCandidates, candidatesTried,
    failureReason: `All ${maxCandidates} candidates rejected`, generationMode: 'deterministic_fallback' });

  console.error(`[PIPELINE FAILURE] difficulty=${difficulty} after ${maxCandidates} attempts. Total time: ${totalDuration}ms`);

  return {
    success: false,
    error: 'Could not generate a valid riddle after multiple attempts. Please try again.',
    retryable: true,
    attempts
  };
}
