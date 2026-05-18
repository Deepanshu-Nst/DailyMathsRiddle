import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runGenerationPipeline, ExclusionContext } from '@/lib/generation/pipeline';
import { withLock } from '@/lib/generation/concurrency';
import { countTodayGenerations, getTodayDailyRiddleExclusions, getRecentPracticeRiddleIds } from '@/lib/riddles/queries';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { createClient } from '@/utils/supabase/server';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';
import { getDailyKeyIST } from '@/lib/timezone';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

const schema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  sessionId: z.string().min(1).max(128),
  previousRiddleId: z.string().nullable().optional(),
});

const DAILY_GENERATION_LIMIT = 10;
const MAX_DEDUP_RETRIES = 2;

/**
 * POST /api/riddles/generate
 *
 * Practice riddle generation endpoint.
 *
 * ISOLATION GUARANTEE:
 * Before generation starts, builds a comprehensive ExclusionContext:
 * 1. TODAY'S DAILY RIDDLES — all 3 difficulties (IDs, slugs, templates, questions)
 * 2. RECENT PRACTICE RIDDLES — last 10 for this session/user (IDs, slugs, templates)
 * 3. PREVIOUS RIDDLE — the client-reported current riddle ID
 *
 * The pipeline MUST reject any generated riddle matching this exclusion set.
 * If all retries fail, returns a structured error — never silently reuses content.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, code: 'INVALID_RESPONSE', message: 'Invalid request payload', detail: parsed.error.flatten() },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { difficulty, sessionId, previousRiddleId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Rate limit check
    const todayCount = await countTodayGenerations(sessionId, userId);
    if (todayCount >= DAILY_GENERATION_LIMIT) {
      return NextResponse.json(
        { success: false, code: 'QUOTA_EXCEEDED', message: `Daily limit of ${DAILY_GENERATION_LIMIT} reached.` },
        { status: 429, headers: NO_CACHE_HEADERS }
      );
    }

    // ── BUILD EXCLUSION CONTEXT ──────────────────────────────────
    const today = getDailyKeyIST();

    // 1. Today's daily riddles (ALL difficulties)
    const dailyExclusions = await getTodayDailyRiddleExclusions(today);

    // 2. Recent practice riddles for this session/user
    const recentPractice = await getRecentPracticeRiddleIds(sessionId, userId, 10);

    // 3. Merge into ExclusionContext
    const allExcluded = [...dailyExclusions, ...recentPractice];
    const excludeIds = Array.from(new Set(allExcluded.map(r => r.id).filter(Boolean)));
    const excludeSlugs = Array.from(new Set(allExcluded.map(r => r.slug).filter(Boolean)));
    const excludeTemplateFamilies = Array.from(new Set(allExcluded.map(r => r.template_family).filter(Boolean) as string[]));
    const excludeQuestions = Array.from(new Set(allExcluded.map(r => r.question).filter(Boolean)));

    // Add previousRiddleId if not already in the list
    if (previousRiddleId && !excludeIds.includes(previousRiddleId)) {
      excludeIds.push(previousRiddleId);
    }

    const exclusion: ExclusionContext = {
      excludeIds,
      excludeSlugs,
      excludeTemplateFamilies,
      excludeQuestions,
    };

    console.log(`[POST /api/riddles/generate] ── EXCLUSION CONTEXT ──`);
    console.log(`[POST /api/riddles/generate] dailyRiddles=${dailyExclusions.length} recentPractice=${recentPractice.length}`);
    console.log(`[POST /api/riddles/generate] excludeIds=[${excludeIds.length}] excludeTemplates=[${excludeTemplateFamilies.join(', ')}]`);

    // ── GENERATE WITH EXCLUSION ──────────────────────────────────
    const lockKey = `extra:${sessionId}:${difficulty}`;

    let lastResult: Awaited<ReturnType<typeof runGenerationPipeline>> | null = null;

    for (let attempt = 0; attempt <= MAX_DEDUP_RETRIES; attempt++) {
      const result = await withLock(lockKey, () =>
        runGenerationPipeline({
          difficulty,
          isDaily: false,
          createdBy: userId,
          sessionId,
          exclusion,
        })
      );

      if (!result.success) {
        return NextResponse.json(
          { success: false, code: 'GENERATION_FAILED', message: result.error, attempts: result.attempts },
          { status: 503, headers: NO_CACHE_HEADERS }
        );
      }

      // ── Final post-pipeline dedup: verify new riddle isn't in exclusion set ──
      if (excludeIds.includes(result.riddle.id)) {
        console.warn(`[POST /api/riddles/generate] Post-pipeline dedup: ID ${result.riddle.id} in exclusion set. Retry ${attempt + 1}/${MAX_DEDUP_RETRIES}`);
        lastResult = result;
        // Add this ID to exclusion for next attempt
        exclusion.excludeIds.push(result.riddle.id);
        if (result.riddle.slug) exclusion.excludeSlugs.push(result.riddle.slug);
        if (result.riddle.template_family) exclusion.excludeTemplateFamilies.push(result.riddle.template_family);
        continue;
      }

      if (previousRiddleId && result.riddle.id === previousRiddleId) {
        console.warn(`[POST /api/riddles/generate] Dedup hit: same ID as previous. Retry ${attempt + 1}/${MAX_DEDUP_RETRIES}`);
        lastResult = result;
        continue;
      }

      lastResult = result;
      break; // Success
    }

    if (!lastResult || !lastResult.success) {
      return NextResponse.json(
        { success: false, code: 'GENERATION_FAILED', message: 'Could not generate a distinct riddle after retries.' },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    const clientRiddle = toClientRiddle(lastResult.riddle);
    const shareUrl = getRiddleShareUrl(lastResult.riddle.slug);

    console.log(`[POST /api/riddles/generate] ── SUCCESS ──`);
    console.log(`[POST /api/riddles/generate] id=${lastResult.riddle.id} slug=${lastResult.riddle.slug} difficulty=${difficulty} template=${lastResult.riddle.template_family ?? 'none'}`);

    return NextResponse.json({
      success: true,
      riddle: clientRiddle,
      shareUrl,
      generationCount: todayCount + 1,
      templateFamily: lastResult.riddle.template_family,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err: unknown) {
    console.error('[POST /api/riddles/generate]', err);

    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, code: 'GENERATION_TIMEOUT', message: 'Generation timed out' },
        { status: 408, headers: NO_CACHE_HEADERS }
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { success: false, code: 'GENERATION_ERROR', message: msg },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
