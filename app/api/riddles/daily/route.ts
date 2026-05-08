import { NextRequest, NextResponse } from 'next/server';
import { getTodayUTC } from '@/lib/timezone';
import { getDailyRiddleOrGenerate } from '@/lib/riddles/daily';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';

export const maxDuration = 300;

/**
 * GET /api/riddles/daily?date=2026-05-08&difficulty=medium
 *
 * DB-first daily riddle endpoint.
 * On cache hit (DB row exists): instant response.
 * On miss: triggers generation pipeline → saves to DB → returns.
 *
 * The DB unique index on (daily_date, difficulty) WHERE is_daily=true
 * ensures idempotency even across concurrent requests.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = (searchParams.get('difficulty') ?? 'medium') as 'easy' | 'medium' | 'hard';
  const date = searchParams.get('date') ?? getTodayUTC();

  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }

  try {
    const dbRiddle = await getDailyRiddleOrGenerate(date, difficulty);

    if (!dbRiddle) {
      return NextResponse.json(
        { error: 'Could not retrieve or generate daily riddle. Please try again.' },
        { status: 503 }
      );
    }

    const clientRiddle = toClientRiddle(dbRiddle);
    const shareUrl = getRiddleShareUrl(dbRiddle.slug);

    return NextResponse.json({
      date,
      difficulty,
      riddle: clientRiddle,
      shareUrl,
    });
  } catch (err) {
    console.error('[GET /api/riddles/daily]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
