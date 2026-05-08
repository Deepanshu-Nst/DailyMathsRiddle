import { NextRequest, NextResponse } from 'next/server';
import { runGenerationPipeline } from '@/lib/generation/pipeline';
import { withLock } from '@/lib/generation/concurrency';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';

export const maxDuration = 300;

/**
 * POST /api/riddle/generate-extra
 *
 * Backwards-compatible extra generation endpoint (used by GenerateMore component).
 * Delegates to the new generation pipeline.
 *
 * Prefer POST /api/riddles/generate for new implementations.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const difficulty = body.difficulty as 'easy' | 'medium' | 'hard';
    const sessionId = body.sessionId as string | undefined;

    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid difficulty' }, { status: 400 });
    }

    const lockKey = `extra:${sessionId ?? 'anon'}:${difficulty}`;

    const result = await withLock(lockKey, () =>
      runGenerationPipeline({
        difficulty,
        isDaily: false,
        sessionId: sessionId ?? null,
      })
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 503 }
      );
    }

    const clientRiddle = toClientRiddle(result.riddle);
    const shareUrl = getRiddleShareUrl(result.riddle.slug);

    // Return in the legacy shape the GenerateMore component expects
    return NextResponse.json({
      success: true,
      riddle: {
        ...clientRiddle,
        // Legacy fields GenerateMore reads
        hint1: result.riddle.hint1,
        hint2: result.riddle.hint2,
        category: result.riddle.category,
      },
      shareUrl,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
