import { NextRequest, NextResponse } from 'next/server';
import { generateAndSelectBestRiddle } from '@/lib/ai/selectBestRiddle';
import { getTodayUTC } from '@/lib/timezone';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { difficulty } = await req.json();

    if (!difficulty) {
      return NextResponse.json({ success: false, error: 'Missing difficulty' }, { status: 400 });
    }

    // Batch size optimization based on difficulty
    let batchSize = 3;
    if (difficulty === 'easy') batchSize = 2;
    if (difficulty === 'hard') batchSize = 4;

    const today = getTodayUTC();
    const newRiddle = await generateAndSelectBestRiddle(today, difficulty, 2, batchSize);

    if (!newRiddle) {
      return NextResponse.json(
        { success: false, error: "Couldn't generate right now. Try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, riddle: newRiddle });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
