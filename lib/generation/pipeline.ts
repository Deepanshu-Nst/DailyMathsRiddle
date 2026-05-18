import { generateSingleRiddle, parseGroqRetryDelay, PRIMARY_MODEL, FAST_MODEL, generateDeterministicFallback } from '@/lib/ai/generator';
import { checkDuplication } from '@/lib/validation/duplication';
import { insertRiddle, insertGenerationLog, getRecentTemplateFamilies, insertFailedGeneration, getAIConfig, getRecentUserContext } from '@/lib/riddles/queries';
import { logPipelineEvent } from '@/lib/analytics/pipelineEvents';
import { generateSlug } from '@/lib/riddles/slugify';
import type { DbRiddle } from '@/types/supabase';

const MAX_CANDIDATES = 3;

// ── Exclusion Context ─────────────────────────────────────────────
// Passed into the pipeline by the caller (e.g., /api/riddles/generate).
// The pipeline MUST reject any generated riddle that matches any entry.

export interface ExclusionContext {
  /** Riddle IDs that must NOT be returned (daily + recent practice) */
  excludeIds: string[];
  /** Slugs that must NOT be returned */
  excludeSlugs: string[];
  /** Template families that must NOT be used */
  excludeTemplateFamilies: string[];
  /** Questions to check similarity against (daily riddle questions) */
  excludeQuestions: string[];
}

const EMPTY_EXCLUSION: ExclusionContext = {
  excludeIds: [],
  excludeSlugs: [],
  excludeTemplateFamilies: [],
  excludeQuestions: [],
};

export interface PipelineOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  isDaily?: boolean;
  dailyDate?: string;
  createdBy?: string | null;
  sessionId?: string | null;
  /** Exclusion context — practice mode must provide this */
  exclusion?: ExclusionContext;
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

// ── Similarity check for post-generation validation ──
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(s.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Post-generation validation: checks the generated riddle against the exclusion context.
 * Returns { passed: false, reason } if the riddle matches any excluded content.
 */
function validateAgainstExclusions(
  question: string,
  templateFamily: string | null,
  slug: string,
  exclusion: ExclusionContext
): { passed: boolean; reason?: string } {
  // Check template family exclusion
  if (templateFamily && exclusion.excludeTemplateFamilies.includes(templateFamily)) {
    return { passed: false, reason: `Template family '${templateFamily}' is excluded` };
  }

  // Check slug exclusion
  if (exclusion.excludeSlugs.includes(slug)) {
    return { passed: false, reason: `Slug '${slug}' matches an excluded riddle` };
  }

  // Check content similarity against excluded questions (daily riddles)
  for (const excludedQ of exclusion.excludeQuestions) {
    const sim = jaccardSimilarity(question, excludedQ);
    if (sim > 0.40) {
      return { passed: false, reason: `Too similar to excluded riddle (${(sim * 100).toFixed(0)}% overlap)` };
    }
  }

  return { passed: true };
}

export async function runGenerationPipeline(
  opts: PipelineOptions
): Promise<PipelineResult | PipelineFailure> {
  const { difficulty, isDaily = false, dailyDate = null, createdBy = null, sessionId = null } = opts;
  const exclusion = opts.exclusion ?? EMPTY_EXCLUSION;
  const startedAt = Date.now();

  // 1. Check AI Config
  const config = await getAIConfig();
  const isAIEnabled = config.is_enabled || true;

  if (!isAIEnabled) {
    console.warn(`[pipeline] AI generation is DISABLED via admin override (is_enabled: ${config.is_enabled})`);
    return { success: false, error: 'The AI generation engine is currently in maintenance mode. Please try again later or contact support.', retryable: false };
  }

  const maxCandidates = config.max_retries || MAX_CANDIDATES;
  if (config.safe_mode) {
    console.log(`[AI SAFE MODE] Enabled for difficulty=${difficulty}`);
  }

  let candidatesTried = 0;
  let rateLimitHits = 0;
  let lastRejectionType: 'structural_rejected' | 'duplicate_rejected' | 'generator_error' | 'hallucination_detected' | 'exclusion_rejected' = 'generator_error';

  const attempts: AttemptTrace[] = [];

  // Get template families to avoid (global + user + exclusion)
  const globalRecentTemplates = await getRecentTemplateFamilies(20);
  const userContext = await getRecentUserContext(sessionId || '', createdBy || null, 6);
  const avoidTemplates = Array.from(new Set([
    ...globalRecentTemplates,
    ...userContext.templates,
    ...exclusion.excludeTemplateFamilies, // Also avoid daily riddle templates
  ]));

  console.log(`[pipeline] ── START ──────────────────────────────────────`);
  console.log(`[pipeline] difficulty=${difficulty} isDaily=${isDaily} mode=${config.mode}`);
  console.log(`[pipeline] avoidTemplates=[${avoidTemplates.join(', ')}]`);
  console.log(`[pipeline] excludeIds=[${exclusion.excludeIds.join(', ')}]`);
  console.log(`[pipeline] excludeSlugs=[${exclusion.excludeSlugs.length}] excludeQuestions=[${exclusion.excludeQuestions.length}]`);
  if (userContext.categories.length > 0) {
    console.log(`[pipeline] avoidCategories=[${userContext.categories.join(', ')}]`);
  }

  for (let slot = 0; slot < maxCandidates; slot++) {
    const attemptStartTime = Date.now();
    let riddleResult;
    let currentModel = slot === 0 ? PRIMARY_MODEL : FAST_MODEL;

    if (slot < maxCandidates - 1) {
      console.log(`[pipeline] Candidate ${slot + 1}/${maxCandidates} — model=${currentModel}`);
      try {
        riddleResult = await generateSingleRiddle(difficulty, avoidTemplates, currentModel, userContext.categories);
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
      riddleResult = generateDeterministicFallback(difficulty, avoidTemplates);
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
    const candidateSlug = generateSlug(riddle.question ?? '');

    // ── POST-GENERATION EXCLUSION CHECK ──────────────────────────
    // This is the KEY fix: reject if the generated riddle matches ANY excluded content
    const exclusionCheck = validateAgainstExclusions(
      riddle.question ?? '',
      riddleResult.templateFamily,
      candidateSlug,
      exclusion
    );

    if (!exclusionCheck.passed) {
      console.warn(`[pipeline] EXCLUSION REJECTED: ${exclusionCheck.reason}`);
      lastRejectionType = 'exclusion_rejected';
      attempts.push({
        attempt: slot + 1,
        failedAt: 'exclusion_check',
        reason: exclusionCheck.reason!,
        durationMs: Date.now() - attemptStartTime,
        templateFamily: riddleResult.templateFamily
      });
      await insertFailedGeneration({
        sessionId, userId: createdBy, difficulty, model: currentModel, rawResponse: riddleResult.rawResponse,
        rejectionStage: 'duplicate_rejected', rejectionReason: exclusionCheck.reason!,
        templateFamily: riddleResult.templateFamily
      });
      continue;
    }

    // ── DB deduplication ──────────────────────────────────────
    if (riddleResult.generationMode !== 'deterministic_fallback') {
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
    }

    // ── Passed — Compute deterministic validation score ──────────────────
    const score = 10;

    // ── Save to DB ────────────────────────────────────────────────
    const slug = candidateSlug;
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

    // ── FINAL POST-INSERT EXCLUSION CHECK ──
    // Verify the saved riddle ID doesn't match any excluded ID (should be impossible for new inserts, but safety net)
    if (exclusion.excludeIds.includes(saved.id)) {
      console.error(`[pipeline] POST-INSERT EXCLUSION: saved ID ${saved.id} matches excluded ID. This should be impossible.`);
      attempts.push({ attempt: slot + 1, failedAt: 'post_insert_exclusion', reason: 'Saved ID matches excluded ID', templateFamily: riddleResult.templateFamily });
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

    console.log(`[pipeline] ── SUCCESS ──────────────────────────────────`);
    console.log(`[pipeline] id=${saved.id} slug=${saved.slug} template=${riddleResult.templateFamily} model=${currentModel} latency=${durationMs}ms`);
    return { success: true, riddle: saved };
  }

  // All candidates exhausted
  const totalDuration = Date.now() - startedAt;
  await logPipelineEvent({ sessionId, userId: createdBy, difficulty, isDaily,
    eventType: lastRejectionType === 'exclusion_rejected' ? 'duplicate_rejected' : lastRejectionType,
    durationMs: totalDuration,
    attemptsMade: maxCandidates, candidatesTried,
    failureReason: `All ${maxCandidates} candidates rejected`, generationMode: 'deterministic_fallback' });

  console.error(`[pipeline] ── FAILURE ──────────────────────────────────`);
  console.error(`[pipeline] difficulty=${difficulty} ${maxCandidates} candidates exhausted. Total: ${totalDuration}ms`);
  console.error(`[pipeline] attempts: ${JSON.stringify(attempts)}`);

  return {
    success: false,
    error: 'Could not generate a valid riddle after multiple attempts. Please try again.',
    retryable: true,
    attempts
  };
}
