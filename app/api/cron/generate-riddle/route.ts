import { NextRequest, NextResponse } from 'next/server';
import { generateAndSelectBestRiddle } from '@/lib/ai/selectBestRiddle';
import { riddleStore } from '@/lib/db/riddleStore';
import { getTodayUTC } from '@/lib/timezone';

// Ensure this cron runs for up to 5 minutes if on Vercel Pro, else 10s default
export const maxDuration = 300; 

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  // In production, ensure VERCEL_CRON_SECRET matches
  if (process.env.VERCEL_CRON_SECRET && authHeader !== `Bearer ${process.env.VERCEL_CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const today = getTodayUTC();
  const difficulty = process.env.DAILY_POST_DIFFICULTY || 'medium';

  // 1. Idempotency Check
  const existingRiddle = await riddleStore.getByDate(today, difficulty);
  if (existingRiddle) {
    return NextResponse.json({
      success: true,
      message: 'Riddle already exists for today. Skipped generation.',
      riddle: existingRiddle
    });
  }

  try {
    // 2. Generate and Select
    const newRiddle = await generateAndSelectBestRiddle(today, difficulty);

    if (!newRiddle) {
      return NextResponse.json({ success: false, error: 'All AI retries failed.' }, { status: 500 });
    }

    // 3. Store the result
    await riddleStore.save(today, newRiddle);

    return NextResponse.json({
      success: true,
      message: 'Successfully generated and stored a new riddle.',
      riddle: newRiddle
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
