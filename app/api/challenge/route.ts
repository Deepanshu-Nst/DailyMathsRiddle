import { NextRequest, NextResponse } from 'next/server';
import { getTodayUTC } from '@/lib/timezone';
import { getActiveRiddleForServer } from '@/lib/riddles/daily';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';

export const maxDuration = 300;

/**
 * GET /api/challenge?difficulty=medium&date=2026-05-08
 *
 * Backwards-compatible challenge endpoint.
 * Internally delegates to the new DB-first daily riddle system.
 * Existing frontend (/riddle/[date]) continues to work unchanged.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get('difficulty') ?? 'medium';
  const date = searchParams.get('date') ?? getTodayUTC();

  try {
    const riddle = await getActiveRiddleForServer(date, difficulty);

    // Strip answer before sending to client
    const { answer, answerVariants, ...safeFields } = riddle;
    void answer; void answerVariants; // explicitly unused — answer is server-only

    const shareUrl = riddle.slug ? getRiddleShareUrl(riddle.slug) : null;

    return NextResponse.json({
      date,
      difficulty,
      riddle: safeFields,
      shareUrl,
    });
  } catch (err) {
    console.error('[GET /api/challenge]', err);
    return NextResponse.json({ error: 'Failed to load riddle' }, { status: 500 });
  }
}
