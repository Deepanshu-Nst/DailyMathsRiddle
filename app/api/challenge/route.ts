import { NextRequest, NextResponse } from 'next/server';
import { getDailyKeyIST } from '@/lib/timezone';
import { getActiveRiddleForServer } from '@/lib/riddles/daily';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';
import { createClient } from '@/utils/supabase/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

/**
 * GET /api/challenge?difficulty=medium&date=2026-05-08
 *
 * Backwards-compatible challenge endpoint.
 * Internally delegates to the new DB-first daily riddle system.
 * Existing frontend (/riddle/[date]) continues to work unchanged.
 *
 * CRITICAL: force-dynamic + no-cache. NEVER serve stale/yesterday's riddle.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get('difficulty') ?? 'medium';
  const requestedDate = searchParams.get('date');
  
  // ALWAYS use getDailyKeyIST() for "today" — never trust client date
  const today = getDailyKeyIST();
  const date = requestedDate ?? today;

  try {
    console.log(`[GET /api/challenge] date=${date} difficulty=${difficulty} (IST today=${today})`);

    const riddle = await getActiveRiddleForServer(date, difficulty);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let isSolved = false;
    let solvedAnswer: string | null = null;
    let explanation: string | null = null;

    if (user && riddle.riddleId) {
      const { data: priorSolve } = await supabase
        .from('user_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('riddle_id', riddle.riddleId)
        .eq('status', 'solved')
        .limit(1)
        .maybeSingle();

      if (priorSolve) {
        isSolved = true;
        solvedAnswer = riddle.answer;
        explanation = riddle.explanation;
      }
    }

    // Strip answer before sending to client
    const { answer, answerVariants, ...safeFields } = riddle;
    void answer; void answerVariants; // explicitly unused — answer is server-only

    const shareUrl = riddle.slug ? getRiddleShareUrl(riddle.slug) : null;

    console.log(`[SERVE challenge] date=${date} difficulty=${difficulty} id=${riddle.riddleId ?? 'none'} solved=${isSolved}`);

    return NextResponse.json({
      date,
      difficulty,
      riddle: safeFields,
      shareUrl,
      isSolved,
      solvedAnswer,
      explanation
    }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('[GET /api/challenge]', err);
    return NextResponse.json(
      { error: 'Failed to load riddle' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
