import { NextRequest, NextResponse } from 'next/server';
import { getActiveRiddle } from '@/lib/riddleService';
import { getTodayUTC } from '@/lib/timezone';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const difficulty = searchParams.get('difficulty') ?? 'easy';
  const date = searchParams.get('date') ?? getTodayUTC();

  const riddle = await getActiveRiddle(date, difficulty);

  // Don't send the answer to the client
  const { answer, answerVariants, ...safeRiddle } = riddle;

  return NextResponse.json({
    date,
    difficulty,
    riddle: safeRiddle,
  });
}
