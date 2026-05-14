import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runGenerationPipeline } from '@/lib/generation/pipeline';
import { withLock } from '@/lib/generation/concurrency';
import { countTodayGenerations } from '@/lib/riddles/queries';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { createClient } from '@/utils/supabase/server';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';

export const maxDuration = 300;

const schema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  sessionId: z.string().min(1).max(128),
});

const DAILY_GENERATION_LIMIT = 10;

/**
 * POST /api/riddles/generate
 *
 * Primary extra-riddle generation endpoint.
 *
 * Race condition prevention:
 * - Request-level lock: `withLock(sessionId:difficulty)` — same session
 *   cannot fire two parallel generations for the same difficulty.
 * - Rate limit: max DAILY_GENERATION_LIMIT extra riddles per session per day.
 * - DB: INSERT always happens before response is sent.
 *
 * Error Contract:
 * Always returns a structured error object with a stable 'code' instead of just messages.
 * { success: false, code: string, message: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { 
          success: false, 
          code: 'INVALID_RESPONSE',
          message: 'Invalid request payload', 
          detail: parsed.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { difficulty, sessionId } = parsed.data;

    // Get authenticated user (null for anon)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Rate limit check
    const todayCount = await countTodayGenerations(sessionId, userId);
    if (todayCount >= DAILY_GENERATION_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          code: 'QUOTA_EXCEEDED',
          message: `You've reached the daily limit of ${DAILY_GENERATION_LIMIT} extra riddles. Come back tomorrow!`,
        },
        { status: 429 }
      );
    }

    // Lock key: one concurrent generation per session+difficulty
    const lockKey = `extra:${sessionId}:${difficulty}`;

    const result = await withLock(lockKey, () =>
      runGenerationPipeline({
        difficulty,
        isDaily: false,
        createdBy: userId,
        sessionId,
      })
    );

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          code: 'GENERATION_FAILED',
          message: result.error,
          attempts: result.attempts,
        },
        { status: 503 }
      );
    }

    const clientRiddle = toClientRiddle(result.riddle);
    const shareUrl = getRiddleShareUrl(result.riddle.slug);

    return NextResponse.json({
      success: true,
      riddle: clientRiddle,
      shareUrl,
      generationCount: todayCount + 1,
      templateFamily: result.riddle.template_family,
    });
  } catch (err: unknown) {
    console.error('[POST /api/riddles/generate]', err);
    
    // Explicit timeout handling
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          code: 'GENERATION_TIMEOUT',
          message: 'Generation timed out'
        },
        { status: 408 }
      );
    }

    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { 
        success: false, 
        code: 'GENERATION_ERROR',
        message: msg 
      }, 
      { status: 500 }
    );
  }
}
