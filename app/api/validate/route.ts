import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTodayUTC } from '@/lib/timezone';
import { getActiveRiddleForServer } from '@/lib/riddles/daily';
import { validateAnswer } from '@/lib/answer-validator';
import { getUser } from '@/lib/auth/getUser';
import { insertAttempt } from '@/lib/riddles/queries';
import { processSolve } from '@/lib/gamification';
import type { Difficulty } from '@/types';

const schema = z.object({
  userAnswer:      z.string().min(1),
  difficulty:      z.enum(['easy', 'medium', 'hard']),
  date:            z.string().optional(),
  riddleId:        z.string().uuid().optional(),
  /** ISO timestamp of when the riddle was first rendered to the user. */
  solveStartedAt:  z.string().datetime().optional().nullable(),
  /** Total submissions including this final correct one. */
  attemptCount:    z.number().int().min(1).optional().default(1),
  hintsUsed:       z.number().int().min(0).optional().default(0),
});

/**
 * POST /api/validate
 *
 * Validates an answer and, for authenticated users on correct solves,
 * runs the full gamification pipeline (streak + XP + stats).
 *
 * Returns isCorrect + gamification payload for authenticated solves.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.parse(body);
    const {
      userAnswer, difficulty, riddleId,
      solveStartedAt, attemptCount, hintsUsed,
    } = parsed;
    const date = parsed.date ?? getTodayUTC();

    // Fetch riddle with answer server-side
    const riddle = await getActiveRiddleForServer(date, difficulty);
    const isCorrect = validateAnswer(userAnswer, riddle.answer, riddle.answerVariants);

    // Get authenticated user
    const user = await getUser();
    const resolvedRiddleId = riddleId ?? riddle.riddleId ?? null;

    // Record attempt in DB
    if (resolvedRiddleId) {
      await insertAttempt({
        userId: user?.id ?? null,
        riddleId: resolvedRiddleId,
        submittedAnswer: userAnswer,
        isCorrect,
      });
    }

    // Gamification — only for authenticated users on correct solves
    let solveResult = null;
    if (isCorrect && user) {
      solveResult = await processSolve({
        userId: user.id,
        difficulty: difficulty as Difficulty,
        riddleId: resolvedRiddleId,
        solveStartedAt: solveStartedAt ?? null,
        attemptCount,
        hintsUsed,
        solvedDate: date,
      });
    }

    return NextResponse.json({
      isCorrect,
      message: isCorrect
        ? '🎉 Correct! Well done.'
        : '❌ Not quite. Try again or use a hint.',
      explanation: isCorrect ? riddle.explanation : null,
      answer: isCorrect ? riddle.answer : null,
      // Gamification payload — null for anon or incorrect
      xpAwarded: solveResult?.xpAwarded ?? null,
      newStreak: solveResult?.newStreak ?? null,
      wasStreakReset: solveResult?.wasStreakReset ?? null,
      isStreakMilestone: solveResult?.isStreakMilestone ?? null,
      bonuses: solveResult?.bonuses ?? null,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Invalid request', detail: String(e) }, { status: 400 });
  }
}
