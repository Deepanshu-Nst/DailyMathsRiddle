/**
 * app/api/cron/daily-publish/route.ts
 * GET /api/cron/daily-publish
 *
 * Protected endpoint called by Vercel cron at 03:30 UTC (9:00 AM IST).
 * Also callable manually: curl /api/cron/daily-publish -H "Authorization: Bearer $CRON_SECRET"
 *
 * Pipeline:
 *  1. Verify CRON_SECRET
 *  2. Get today's riddle (configured difficulty)
 *  3. Generate captions + image
 *  4. Create/update post record
 *  5. Publish to all enabled platforms (with idempotency)
 *  6. On failure: retry jobs already enqueued by publisher.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRiddleByDateAndDifficulty } from '@/lib/riddle-bank';
import { getTodayUTC } from '@/lib/timezone';
import { generateCaptions, generateHashtags } from '@/lib/publishing/content-engine';
import { generateRiddleImage } from '@/lib/publishing/image-generator';
import { createPost, getPostByDate, updatePost } from '@/lib/publishing/post-store';
import { publishToPlatforms } from '@/lib/publishing/publisher';
import { Platform, CaptionVariants } from '@/types/publishing';

// Allow long execution for publishing (Vercel Pro: up to 300s)
export const maxDuration = 60;

const ENABLED_PLATFORMS: Platform[] = ['linkedin', 'twitter', 'instagram', 'whatsapp'];

export async function GET(req: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (secret && authHeader !== `Bearer ${secret}`) {
    // In dev without secret set, allow (for easy testing)
    if (secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const date = getTodayUTC();
  const difficulty = (process.env.DAILY_POST_DIFFICULTY ?? 'medium') as 'easy' | 'medium' | 'hard';

  console.log(`[Cron] Starting daily publish — date: ${date}, difficulty: ${difficulty}`);

  try {
    const riddle = getRiddleByDateAndDifficulty(date, difficulty);

    const riddleInput = {
      question: riddle.question,
      difficulty: riddle.difficulty,
      category: riddle.category,
      hint1: riddle.hint1,
      date,
    };

    const captions = generateCaptions(riddleInput);
    const hashtags = generateHashtags(riddleInput);
    const imageDataUrl = generateRiddleImage(riddleInput);

    // ── Idempotent post creation ─────────────────────────────────
    let post = await getPostByDate(date);
    if (!post) {
      console.log(`[Cron] Creating new post record for ${date}`);
      post = await createPost({
        date,
        riddle_text: riddle.question,
        difficulty: riddle.difficulty,
        hint: riddle.hint1,
        answer: riddle.answer,
        caption_variants: captions,
        hashtag_sets: hashtags,
        image_url: imageDataUrl,
        status: 'draft',
      });
    } else {
      console.log(`[Cron] Post record already exists for ${date} (id: ${post.id})`);
      // Update image and captions in case they've been regenerated
      await updatePost(post.id, {
        caption_variants: captions as CaptionVariants,
        image_url: imageDataUrl,
      });
    }

    // ── Publish ──────────────────────────────────────────────────
    const summary = await publishToPlatforms({
      postId: post.id,
      date,
      platforms: ENABLED_PLATFORMS,
      captions: {
        linkedin: captions.linkedin,
        instagram: captions.instagram,
        twitter: captions.twitter,
        whatsapp: captions.whatsapp,
      },
      imageDataUrl,
      hashtags: {
        linkedin: hashtags.linkedin,
        instagram: hashtags.instagram,
        twitter: hashtags.twitter,
        whatsapp: hashtags.whatsapp,
      },
    });

    const elapsed = Date.now() - startTime;
    const successCount = Object.values(summary.results).filter(r => r?.success).length;
    const failCount = Object.values(summary.results).filter(r => !r?.success).length;

    console.log(`[Cron] Done in ${elapsed}ms — ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      ok: true,
      date,
      difficulty,
      postId: post.id,
      results: summary.results,
      platformStatus: summary.platformStatus,
      elapsed_ms: elapsed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Cron] Fatal error:', msg);
    return NextResponse.json({ error: 'Cron failed', detail: msg }, { status: 500 });
  }
}
