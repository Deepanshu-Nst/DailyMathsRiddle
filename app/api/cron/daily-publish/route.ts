import { NextRequest, NextResponse } from 'next/server';
import { publishFromQueue, preGenerateForDate } from '@/lib/admin/publishPipeline';
import { getOfficialDailyDate } from '@/lib/timezone';

export const maxDuration = 300;

/**
 * Cron: Publish today's riddle at midnight IST.
 * Runs at 18:30 UTC = 00:00 IST.
 *
 * 1. Promotes the top-priority pending queue entry to live.
 * 2. If no queue entry exists, runs an emergency generation as fallback.
 * 3. Returns confirmation with publish details.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const today = getOfficialDailyDate();
  const difficulty = (process.env.DAILY_POST_DIFFICULTY || 'medium') as 'easy' | 'medium' | 'hard';

  console.log(`[cron/daily-publish] Publishing for ${today} (${difficulty})`);

  // Check if a live riddle already exists (idempotency)
  const { createServiceClient } = await import('@/utils/supabase/server');
  const supabase = (await createServiceClient()) as any;

  const { data: existing } = await supabase
    .from('riddles')
    .select('id')
    .eq('daily_date', today)
    .eq('difficulty', difficulty)
    .eq('is_daily', true)
    .eq('status', 'published')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      message: `Riddle already live for ${today}. No action needed.`,
      riddleId: existing.id,
      skipped: true,
    });
  }

  // Try to publish from queue
  const publishResult = await publishFromQueue(today, difficulty);

  if (publishResult.success) {
    console.log(`[cron/daily-publish] Published ${publishResult.riddleId} for ${today}`);
    return NextResponse.json({
      success: true,
      message: `Published riddle for ${today}.`,
      riddleId: publishResult.riddleId,
      source: 'queue',
    });
  }

  // Fallback: emergency generation
  console.warn(`[cron/daily-publish] No queue entry. Running emergency generation for ${today}.`);
  const genResult = await preGenerateForDate(today, difficulty);

  if (!genResult.success) {
    console.error(`[cron/daily-publish] Emergency generation failed for ${today}:`, genResult.error);
    return NextResponse.json(
      { success: false, error: `Publish failed: ${genResult.error}` },
      { status: 500 }
    );
  }

  // Publish the freshly generated entry
  const retryPublish = await publishFromQueue(today, difficulty);

  if (retryPublish.success) {
    console.log(`[cron/daily-publish] Emergency publish succeeded: ${retryPublish.riddleId}`);
    return NextResponse.json({
      success: true,
      message: `Emergency generated and published riddle for ${today}.`,
      riddleId: retryPublish.riddleId,
      source: 'emergency_generation',
    });
  }

  return NextResponse.json(
    { success: false, error: 'All publish attempts failed.' },
    { status: 500 }
  );
}
