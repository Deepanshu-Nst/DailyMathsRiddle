import { NextRequest, NextResponse } from 'next/server';
import { getActiveRiddle } from '@/lib/riddleService';
import { validateAnswer } from '@/lib/answer-validator';
import { getTodayUTC } from '@/lib/timezone';
import { z } from 'zod';

const schema = z.object({
  userAnswer: z.string().min(1),
  difficulty: z.enum(['easy','medium','hard']),
  date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAnswer, difficulty, date: rawDate } = schema.parse(body);
    const date = rawDate ?? getTodayUTC();

    const riddle = await getActiveRiddle(date, difficulty);
    const isCorrect = validateAnswer(userAnswer, riddle.answer, riddle.answerVariants);

    return NextResponse.json({
      isCorrect,
      message: isCorrect
        ? '🎉 Correct! Well done.'
        : '❌ Not quite. Try again or use a hint.',
      explanation: isCorrect ? riddle.explanation : null,
      answer: isCorrect ? riddle.answer : null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Invalid request', detail: String(e) }, { status: 400 });
  }
}
