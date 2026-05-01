/**
 * app/api/cron/retry-failed/route.ts
 * GET /api/cron/retry-failed
 *
 * Called by Vercel cron at +10min, +30min, +2hr after the main publish run.
 * Drains the retry queue from Redis, re-attempts each failed platform.
 *
 * Schedule (UTC):
 *   03:40 → +10 min after 03:30
 *   04:00 → +30 min after 03:30
 *   05:30 → +2hr after 03:30
 */

import { NextRequest, NextResponse } from 'next/server';
import { drainRetryQueue } from '@/lib/publishing/redis-store';
import { retryPlatform } from '@/lib/publishing/publisher';
import { Platform } from '@/types/publishing';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[RetryFailedCron] Draining retry queue...');

  try {
    const jobs = await drainRetryQueue();
    console.log(`[RetryFailedCron] Found ${jobs.length} jobs due`);

    if (jobs.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, results: [] });
    }

    const results = await Promise.all(
      jobs.map(async (job) => {
        console.log(`[RetryFailedCron] Retrying ${job.platform} for post ${job.postId}`);
        try {
          const result = await retryPlatform(job.postId, job.platform as Platform);
          return {
            postId: job.postId,
            platform: job.platform,
            success: result.success,
            error: result.error,
          };
        } catch (err) {
          return {
            postId: job.postId,
            platform: job.platform,
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      })
    );

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[RetryFailedCron] ${succeeded} succeeded, ${failed} still failing`);

    return NextResponse.json({ ok: true, processed: jobs.length, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[RetryFailedCron] Error:', msg);
    return NextResponse.json({ error: 'Retry cron failed', detail: msg }, { status: 500 });
  }
}
