import { NextRequest, NextResponse } from 'next/server';
import { preGenerateForDate } from '@/lib/admin/publishPipeline';
import { getOfficialDailyDate, addOfficialCalendarDays } from '@/lib/timezone';

export const maxDuration = 300;

/**
 * Cron: Pre-generate tomorrow's riddle.
 * Runs at 15:00 UTC (8:30 PM IST) — 3.5 hours before the midnight publish.
 * Idempotent: skips if a pending queue entry already exists for tomorrow.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const today = getOfficialDailyDate();
  const tomorrow = addOfficialCalendarDays(today, 1);
  const difficulty = (process.env.DAILY_POST_DIFFICULTY || 'medium') as 'easy' | 'medium' | 'hard';

  console.log(`[cron/generate-riddle] Generating for ${tomorrow} (${difficulty})`);

  // Check if queue already has a pending entry for tomorrow
  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  const { data: existing } = await supabase
    .from('daily_riddle_queue')
    .select('id')
    .eq('target_date', tomorrow)
    .eq('difficulty', difficulty)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      message: `Queue entry already exists for ${tomorrow}. Skipped generation.`,
      skipped: true,
    });
  }

  // Also check if a live riddle already exists for tomorrow
  const { data: liveRiddle } = await supabase
    .from('riddles')
    .select('id')
    .eq('daily_date', tomorrow)
    .eq('difficulty', difficulty)
    .eq('is_daily', true)
    .eq('status', 'published')
    .maybeSingle();

  if (liveRiddle) {
    return NextResponse.json({
      success: true,
      message: `Live riddle already exists for ${tomorrow}. Skipped generation.`,
      skipped: true,
    });
  }

  const result = await preGenerateForDate(tomorrow, difficulty);

  if (!result.success) {
    console.error(`[cron/generate-riddle] Failed for ${tomorrow}:`, result.error);
    return NextResponse.json(
      { success: false, error: result.error, job: result.job },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Generated and queued riddle for ${tomorrow}.`,
    job: result.job,
  });
}
