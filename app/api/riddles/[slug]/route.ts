import { NextRequest, NextResponse } from 'next/server';
import { getRiddleBySlug } from '@/lib/riddles/queries';
import { toClientRiddle } from '@/lib/riddles/toClientRiddle';
import { getRiddleShareUrl } from '@/lib/share/getCanonicalUrl';

/**
 * GET /api/riddles/[slug]
 *
 * Fetches a specific riddle by its immutable slug.
 * Used by the /r/[slug] share page to load the exact riddle.
 * Never redirects to a different riddle.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    const dbRiddle = await getRiddleBySlug(slug);

    if (!dbRiddle) {
      return NextResponse.json({ error: 'Riddle not found' }, { status: 404 });
    }

    const clientRiddle = toClientRiddle(dbRiddle);
    const shareUrl = getRiddleShareUrl(dbRiddle.slug);

    return NextResponse.json({
      riddle: clientRiddle,
      shareUrl,
      isDaily: dbRiddle.is_daily,
      dailyDate: dbRiddle.daily_date,
      difficulty: dbRiddle.difficulty,
      category: dbRiddle.category,
    });
  } catch (err) {
    console.error('[GET /api/riddles/[slug]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
