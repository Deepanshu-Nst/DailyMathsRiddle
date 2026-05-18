import { NextRequest, NextResponse } from 'next/server';
import { preGenerateForDate } from '@/lib/admin/publishPipeline';
import { getDailyKeyIST, addOfficialCalendarDays } from '@/lib/timezone';

export const maxDuration = 300;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/**
 * Cron: Pre-generate tomorrow's riddles for ALL difficulties.
 * Runs at 15:00 UTC (8:30 PM IST) — 3.5 hours before the midnight publish.
 * Idempotent: skips if a pending queue entry or live riddle already exists for tomorrow.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const today = getDailyKeyIST();
  const tomorrow = addOfficialCalendarDays(today, 1);

  console.log(`[cron/generate-riddle] ══════════════════════════════════════`);
  console.log(`[cron/generate-riddle] Pre-generating for ${tomorrow} — all difficulties`);
  console.log(`[cron/generate-riddle] ══════════════════════════════════════`);

  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  const results: Array<{
    difficulty: string;
    status: 'skipped_queue_exists' | 'skipped_live_exists' | 'generated' | 'failed';
    error?: string;
    jobId?: string;
  }> = [];

  for (const difficulty of DIFFICULTIES) {
    console.log(`[cron/generate-riddle] ── ${difficulty.toUpperCase()} ──────────────`);

    // Check if queue already has a pending entry
    const { data: existingQueue } = await supabase
      .from('daily_riddle_queue')
      .select('id')
      .eq('target_date', tomorrow)
      .eq('difficulty', difficulty)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle();

    if (existingQueue) {
      console.log(`[cron/generate-riddle] ${difficulty}: Queue entry exists. Skipped.`);
      results.push({ difficulty, status: 'skipped_queue_exists' });
      continue;
    }

    // Check if a live riddle already exists
    const { data: liveRiddle } = await supabase
      .from('riddles')
      .select('id')
      .eq('daily_date', tomorrow)
      .eq('difficulty', difficulty)
      .eq('is_daily', true)
      .eq('status', 'published')
      .maybeSingle();

    if (liveRiddle) {
      console.log(`[cron/generate-riddle] ${difficulty}: Live riddle exists. Skipped.`);
      results.push({ difficulty, status: 'skipped_live_exists' });
      continue;
    }

    // Generate
    const result = await preGenerateForDate(tomorrow, difficulty);

    if (!result.success) {
      console.error(`[cron/generate-riddle] ${difficulty}: FAILED: ${result.error}`);
      results.push({ difficulty, status: 'failed', error: result.error });
      continue;
    }

    console.log(`[cron/generate-riddle] ${difficulty}: Generated and queued (job=${result.job?.id})`);
    results.push({ difficulty, status: 'generated', jobId: result.job?.id });
  }

  const failed = results.filter(r => r.status === 'failed');
  const allSuccess = failed.length === 0;

  console.log(`[cron/generate-riddle] ══════════════════════════════════════`);
  console.log(`[cron/generate-riddle] Complete: ${results.filter(r => r.status !== 'failed').length}/3 ready for ${tomorrow}`);
  console.log(`[cron/generate-riddle] ══════════════════════════════════════`);

  return NextResponse.json({
    success: allSuccess,
    targetDate: tomorrow,
    results,
    summary: {
      total: DIFFICULTIES.length,
      ready: results.filter(r => r.status !== 'failed').length,
      failed: failed.length,
    },
  }, { status: allSuccess ? 200 : 207 });
}
