import { NextRequest, NextResponse } from 'next/server';
import { getOfficialDailyDate, getDailyKeyIST } from '@/lib/timezone';
import { getDailyRiddleOrGenerate } from '@/lib/riddles/daily';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

/**
 * GET /api/riddles/daily?date=2026-05-08&difficulty=medium
 *
 * DB-first daily riddle endpoint.
 * On cache hit (DB row exists): instant response.
 * On miss: triggers generation pipeline → saves to DB → returns.
 *
 * CRITICAL: This route MUST NOT be cached by Next.js.
 * - dynamic = 'force-dynamic' prevents build-time static rendering
 * - Cache-Control: no-store prevents edge/CDN caching
 *
 * NEVER returns yesterday's riddle. If today's riddle is missing:
 * - explicitly generates
 * - explicitly publishes
 * - explicitly logs
 *
 * The DB unique index on (daily_date, difficulty) WHERE is_daily=true
 * ensures idempotency even across concurrent requests.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = (searchParams.get('difficulty') ?? 'medium') as 'easy' | 'medium' | 'hard';
  const requestedDate = searchParams.get('date');
  
  // ALWAYS use getDailyKeyIST() for "today" — never trust client date
  const today = getDailyKeyIST();
  const date = requestedDate ?? today;

  if (!['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400, headers: NO_CACHE_HEADERS });
  }

  try {
    console.log(`[GET /api/riddles/daily] date=${date} difficulty=${difficulty} (IST today=${today})`);

    const dbRiddle = await getDailyRiddleOrGenerate(date, difficulty);

    if (!dbRiddle) {
      console.error(`[GET /api/riddles/daily] FAILED to retrieve or generate for date=${date} difficulty=${difficulty}`);
      return NextResponse.json(
        { error: 'Could not retrieve or generate daily riddle. Please try again.' },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    // Verify we're not accidentally serving a stale riddle
    if (dbRiddle.daily_date !== date) {
      console.error(`[GET /api/riddles/daily] STALE RIDDLE DETECTED: requested=${date} got=${dbRiddle.daily_date}. Regenerating.`);
      return NextResponse.json(
        { error: 'Stale riddle detected. Please refresh.' },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    const clientRiddle = toClientRiddle(dbRiddle);
    const shareUrl = getRiddleShareUrl(dbRiddle.slug);

    console.log(`[SERVE daily] date=${date} difficulty=${difficulty} id=${dbRiddle.id} slug=${dbRiddle.slug} template=${dbRiddle.template_family ?? 'none'}`);

    return NextResponse.json({
      date,
      difficulty,
      riddle: clientRiddle,
      shareUrl,
    }, { headers: NO_CACHE_HEADERS });
  } catch (err) {
    console.error('[GET /api/riddles/daily]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
