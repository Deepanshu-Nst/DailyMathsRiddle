import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTodayUTC } from '@/lib/timezone';
import { getActiveRiddleForServer } from '@/lib/riddles/daily';
import { validateAnswer } from '@/lib/answer-validator';
import { getUser } from '@/lib/auth/getUser';
import { insertAttempt } from '@/lib/riddles/queries';

const schema = z.object({
  userAnswer: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  date: z.string().optional(),
  riddleId: z.string().uuid().optional(), // accept riddleId if provided by new frontend
});

/**
 * POST /api/validate
 *
 * Backwards-compatible answer validation endpoint.
 * Delegates to new DB-first riddle retrieval + records attempt in DB.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAnswer, difficulty, date: rawDate, riddleId } = schema.parse(body);
    const date = rawDate ?? getTodayUTC();

    // Fetch the full riddle (with answer) server-side
    const riddle = await getActiveRiddleForServer(date, difficulty);
    const isCorrect = validateAnswer(userAnswer, riddle.answer, riddle.answerVariants);

    // Record attempt in DB (non-blocking)
    const user = await getUser();
    const resolvedRiddleId = riddleId ?? riddle.riddleId;
    if (resolvedRiddleId) {
      await insertAttempt({
        userId: user?.id ?? null,
        riddleId: resolvedRiddleId,
        submittedAnswer: userAnswer,
        isCorrect,
      });
    }

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
