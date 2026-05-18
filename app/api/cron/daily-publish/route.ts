import { NextRequest, NextResponse } from 'next/server';
import { publishFromQueue, preGenerateForDate } from '@/lib/admin/publishPipeline';
import { getDailyKeyIST } from '@/lib/timezone';

export const maxDuration = 300;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/**
 * Cron: Publish today's riddles at midnight IST.
 * Runs at 18:30 UTC = 00:00 IST.
 *
 * CRITICAL: Publishes ALL THREE difficulties (easy, medium, hard).
 *
 * For each difficulty:
 * 1. Check if a live riddle already exists (idempotency).
 * 2. Promote the top-priority pending queue entry to live.
 * 3. If no queue entry exists, run emergency generation as fallback.
 * 4. Log all actions for operational visibility.
 *
 * Guarantee: After this cron completes, at least 1 riddle per difficulty
 * must exist for today. If any are missing, emit warning logs.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const today = getDailyKeyIST();
  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  console.log(`[cron/daily-publish] ══════════════════════════════════════`);
  console.log(`[cron/daily-publish] Publishing for ${today} — all difficulties`);
  console.log(`[cron/daily-publish] ══════════════════════════════════════`);

  const results: Array<{
    difficulty: string;
    status: 'already_live' | 'published_from_queue' | 'emergency_generated' | 'failed';
    riddleId?: string;
    error?: string;
  }> = [];

  for (const difficulty of DIFFICULTIES) {
    console.log(`[cron/daily-publish] ── ${difficulty.toUpperCase()} ──────────────`);

    // 1. Check if a live riddle already exists (idempotency)
    const { data: existing } = await supabase
      .from('riddles')
      .select('id')
      .eq('daily_date', today)
      .eq('difficulty', difficulty)
      .eq('is_daily', true)
      .eq('status', 'published')
      .maybeSingle();

    if (existing) {
      console.log(`[cron/daily-publish] ${difficulty}: Already live (${existing.id}). Skipped.`);
      results.push({ difficulty, status: 'already_live', riddleId: existing.id });
      continue;
    }

    // 2. Try to publish from queue
    const publishResult = await publishFromQueue(today, difficulty);

    if (publishResult.success) {
      console.log(`[cron/daily-publish] ${difficulty}: Published from queue (${publishResult.riddleId})`);
      results.push({ difficulty, status: 'published_from_queue', riddleId: publishResult.riddleId });
      continue;
    }

    // 3. Fallback: emergency generation
    console.warn(`[cron/daily-publish] ${difficulty}: No queue entry. Running emergency generation.`);
    const genResult = await preGenerateForDate(today, difficulty);

    if (!genResult.success) {
      console.error(`[cron/daily-publish] ${difficulty}: Emergency generation FAILED: ${genResult.error}`);
      results.push({ difficulty, status: 'failed', error: genResult.error });
      continue;
    }

    // 4. Publish the freshly generated entry
    const retryPublish = await publishFromQueue(today, difficulty);

    if (retryPublish.success) {
      console.log(`[cron/daily-publish] ${difficulty}: Emergency published (${retryPublish.riddleId})`);
      results.push({ difficulty, status: 'emergency_generated', riddleId: retryPublish.riddleId });
    } else {
      console.error(`[cron/daily-publish] ${difficulty}: Post-emergency publish FAILED`);
      results.push({ difficulty, status: 'failed', error: 'Post-emergency publish failed' });
    }
  }

  // ── Final health check ──
  const failed = results.filter(r => r.status === 'failed');
  const allSuccess = failed.length === 0;

  if (!allSuccess) {
    console.error(`[cron/daily-publish] ⚠ ${failed.length} difficulty(ies) FAILED to publish for ${today}:`,
      failed.map(f => `${f.difficulty}: ${f.error}`).join(', ')
    );
  }

  console.log(`[cron/daily-publish] ══════════════════════════════════════`);
  console.log(`[cron/daily-publish] Complete: ${results.filter(r => r.status !== 'failed').length}/3 published for ${today}`);
  console.log(`[cron/daily-publish] ══════════════════════════════════════`);

  return NextResponse.json({
    success: allSuccess,
    date: today,
    results,
    summary: {
      total: DIFFICULTIES.length,
      published: results.filter(r => r.status !== 'failed').length,
      failed: failed.length,
    },
  }, { status: allSuccess ? 200 : 207 });
}
