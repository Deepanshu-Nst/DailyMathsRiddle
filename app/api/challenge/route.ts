import { NextRequest, NextResponse } from 'next/server';
import { getOfficialDailyDate } from '@/lib/timezone';
import { getActiveRiddleForServer } from '@/lib/riddles/daily';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';
import { createClient } from '@/utils/supabase/server';

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
  const date = searchParams.get('date') ?? getOfficialDailyDate();

  try {
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

    return NextResponse.json({
      date,
      difficulty,
      riddle: safeFields,
      shareUrl,
      isSolved,
      solvedAnswer,
      explanation
    });
  } catch (err) {
    console.error('[GET /api/challenge]', err);
    return NextResponse.json({ error: 'Failed to load riddle' }, { status: 500 });
  }
}
