import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRiddleById } from '@/lib/riddles/queries';
import { insertAttempt } from '@/lib/riddles/queries';
import { validateAnswer } from '@/lib/answer-validator';
import { getUser } from '@/lib/auth/getUser';

const schema = z.object({
  riddleId: z.string().uuid(),
  submittedAnswer: z.string().min(1).max(500),
  sessionId: z.string().optional(),
});

/**
 * POST /api/riddles/attempt
 *
 * Records an answer attempt and validates correctness.
 * Works for both authenticated and anonymous users.
 *
 * - Fetches riddle by ID (includes answer — server-side only)
 * - Validates answer using existing answer-validator
 * - Records attempt in user_attempts table
 * - Returns isCorrect + explanation/answer if correct
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', detail: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { riddleId, submittedAnswer } = parsed.data;

    // Fetch the full riddle (with answer) server-side
    const riddle = await getRiddleById(riddleId);
    if (!riddle) {
      return NextResponse.json({ error: 'Riddle not found' }, { status: 404 });
    }

    // Validate answer
    const isCorrect = validateAnswer(
      submittedAnswer,
      riddle.answer,
      riddle.answer_variants ?? []
    );

    // Get user (null for anon)
    const user = await getUser();

    // Record attempt (non-blocking — don't let DB failure break the UX)
    await insertAttempt({
      userId: user?.id ?? null,
      riddleId,
      submittedAnswer,
      isCorrect,
    });

    return NextResponse.json({
      isCorrect,
      message: isCorrect
        ? '🎉 Correct! Well done.'
        : '❌ Not quite. Try again or use a hint.',
      explanation: isCorrect ? riddle.explanation : null,
      answer: isCorrect ? riddle.answer : null,
      riddleId,
    });
  } catch (err) {
    console.error('[POST /api/riddles/attempt]', err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
