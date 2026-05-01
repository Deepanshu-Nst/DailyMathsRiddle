import { NextRequest, NextResponse } from 'next/server';
import { generateAndSelectBestRiddle } from '@/lib/ai/selectBestRiddle';
import { usageTracker } from '@/lib/usage/usageTracker';
import { getTodayUTC } from '@/lib/timezone';

export const maxDuration = 300; 

export async function POST(req: NextRequest) {
  try {
    const { sessionId, difficulty } = await req.json();

    if (!sessionId || !difficulty) {
      return NextResponse.json({ success: false, error: 'Missing sessionId or difficulty' }, { status: 400 });
    }

    const today = getTodayUTC();

    // 1. Validate limits & locks & cooldown
    const check = await usageTracker.checkAndLock(sessionId, today);
    if (!check.allowed) {
      return NextResponse.json({ success: false, error: check.reason }, { status: 429 });
    }

    try {
      // 2. Batch size optimization based on difficulty
      let batchSize = 3;
      if (difficulty === 'easy') batchSize = 2;
      if (difficulty === 'hard') batchSize = 4;

      // 3. Generate Extra Riddle
      const newRiddle = await generateAndSelectBestRiddle(today, difficulty, 2, batchSize);

      if (!newRiddle) {
        await usageTracker.unlockOnFailure(sessionId, today);
        return NextResponse.json({ success: false, error: "Couldn't generate right now. Try again later." }, { status: 500 });
      }

      // 4. Increment usage & unlock
      await usageTracker.incrementAndUnlock(sessionId, today);
      const usage = await usageTracker.getUsage(sessionId, today);

      return NextResponse.json({
        success: true,
        riddle: newRiddle,
        usage: {
          count: usage.count,
          remaining: 10 - usage.count
        }
      });
    } catch (e: unknown) {
      // Failsafe unlock
      await usageTracker.unlockOnFailure(sessionId, today);
      throw e;
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
