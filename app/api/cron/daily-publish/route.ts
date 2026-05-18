import { NextRequest, NextResponse } from 'next/server';
import { getDailyKeyIST } from '@/lib/timezone';
import { publishToSlot, hasSlot, hasManualSlot } from '@/lib/riddles/slots';
import { getScheduledRiddle, insertRiddle } from '@/lib/riddles/queries';
import { publishFromQueue, preGenerateForDate } from '@/lib/admin/publishPipeline';
import { slugify } from '@/utils/slugify';

export const maxDuration = 300;

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

/**
 * Cron: Publish today's riddles at midnight IST.
 * Runs at 18:30 UTC = 00:00 IST.
 *
 * FOR EACH difficulty:
 *   1. If manual scheduled exists → promote to slot
 *   2. If slot already exists → skip
 *   3. If AI queue entry exists → publish from queue to slot
 *   4. Emergency AI generation → slot
 *   5. Log source selection clearly
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const today = getDailyKeyIST();

  console.log(`[cron/daily-publish] ══════════════════════════════════════`);
  console.log(`[cron/daily-publish] Publishing for ${today} — all difficulties`);
  console.log(`[cron/daily-publish] ══════════════════════════════════════`);

  const results: Array<{
    difficulty: string;
    status: 'manual_scheduled' | 'already_slotted' | 'published_from_queue' | 'emergency_generated' | 'failed';
    source: string;
    riddleId?: string;
    error?: string;
  }> = [];

  for (const difficulty of DIFFICULTIES) {
    console.log(`[cron/daily-publish] ── ${difficulty.toUpperCase()} ──────────────`);

    // ── 1. Check for admin-scheduled manual riddle FIRST ──
    const scheduled = await getScheduledRiddle(today, difficulty);
    if (scheduled) {
      console.log(`[cron/daily-publish] ${difficulty}: Found scheduled riddle. Promoting.`);

      // Create immutable riddle record
      const promoted = await insertRiddle({
        question: scheduled.question,
        answer: scheduled.answer,
        explanation: scheduled.explanation,
        difficulty: scheduled.difficulty,
        is_daily: true,
        daily_date: today,
        status: 'published',
        slug: slugify(scheduled.question.slice(0, 50)) + '-' + Date.now().toString(36),
        source_type: 'admin',
        category: 'Editorial',
      });

      if (promoted) {
        await publishToSlot({
          date: today,
          difficulty,
          riddleId: promoted.id,
          sourceType: 'scheduled',
          isManual: true,
          publishedBy: scheduled.created_by ?? null,
        });

        // Mark scheduled riddle as published
        const { createServiceClient } = await import('@/utils/supabase/server');
        const supabase = (await createServiceClient()) as any;
        await supabase
          .from('scheduled_riddles')
          .update({ status: 'published' })
          .eq('id', scheduled.id);

        console.log(`[cron/daily-publish] ${difficulty}: MANUAL SCHEDULED → slot (${promoted.id})`);
        results.push({ difficulty, status: 'manual_scheduled', source: 'scheduled', riddleId: promoted.id });
        continue;
      }
    }

    // ── 2. Check if slot already exists (idempotency) ──
    const slotExists = await hasSlot(today, difficulty);
    if (slotExists) {
      console.log(`[cron/daily-publish] ${difficulty}: Slot already exists. Skipped.`);
      results.push({ difficulty, status: 'already_slotted', source: 'existing' });
      continue;
    }

    // ── 3. Try to publish from AI queue ──
    const publishResult = await publishFromQueue(today, difficulty);
    if (publishResult.success && publishResult.riddleId) {
      await publishToSlot({
        date: today,
        difficulty,
        riddleId: publishResult.riddleId,
        sourceType: 'ai',
        isManual: false,
      });

      console.log(`[cron/daily-publish] ${difficulty}: AI QUEUE → slot (${publishResult.riddleId})`);
      results.push({ difficulty, status: 'published_from_queue', source: 'ai_queue', riddleId: publishResult.riddleId });
      continue;
    }

    // ── 4. Emergency AI generation ──
    console.warn(`[cron/daily-publish] ${difficulty}: No queue entry. Running emergency generation.`);
    const genResult = await preGenerateForDate(today, difficulty);

    if (!genResult.success) {
      console.error(`[cron/daily-publish] ${difficulty}: Emergency generation FAILED: ${genResult.error}`);
      results.push({ difficulty, status: 'failed', source: 'none', error: genResult.error });
      continue;
    }

    // Publish emergency-generated riddle from queue
    const retryPublish = await publishFromQueue(today, difficulty);
    if (retryPublish.success && retryPublish.riddleId) {
      await publishToSlot({
        date: today,
        difficulty,
        riddleId: retryPublish.riddleId,
        sourceType: 'emergency',
        isManual: false,
      });

      console.log(`[cron/daily-publish] ${difficulty}: EMERGENCY AI → slot (${retryPublish.riddleId})`);
      results.push({ difficulty, status: 'emergency_generated', source: 'emergency_ai', riddleId: retryPublish.riddleId });
    } else {
      console.error(`[cron/daily-publish] ${difficulty}: Post-emergency publish FAILED`);
      results.push({ difficulty, status: 'failed', source: 'none', error: 'Post-emergency publish failed' });
    }
  }

  // ── Final health check ──
  const failed = results.filter(r => r.status === 'failed');
  const allSuccess = failed.length === 0;

  console.log(`[cron/daily-publish] ══════════════════════════════════════`);
  console.log(`[cron/daily-publish] Complete: ${results.filter(r => r.status !== 'failed').length}/3 published for ${today}`);
  results.forEach(r => console.log(`[cron/daily-publish]   ${r.difficulty}: ${r.status} (${r.source})`));
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
