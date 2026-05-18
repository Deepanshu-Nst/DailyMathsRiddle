import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOfficialDailyDate } from '@/lib/timezone';
import { getActiveRiddleForServer } from '@/lib/riddles/daily';
import { validateAnswer } from '@/lib/answer-validator';
import { createClient } from '@/utils/supabase/server';
import { insertAttempt, hasUserSolvedRiddle, getRiddleById } from '@/lib/riddles/queries';
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
  isPractice:      z.boolean().optional().default(false),
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
      solveStartedAt, attemptCount, hintsUsed, isPractice
    } = parsed;
    const date = parsed.date ?? getOfficialDailyDate();

    // Fetch riddle with answer server-side
    let riddle;
    if (isPractice && riddleId) {
      riddle = await getRiddleById(riddleId);
      if (!riddle) {
        return NextResponse.json({ error: 'Riddle not found' }, { status: 404 });
      }
    } else {
      riddle = await getActiveRiddleForServer(date, difficulty);
    }
    
    const answerVariants = (riddle as any).answer_variants || (riddle as any).answerVariants || [];
    const isCorrect = validateAnswer(userAnswer, riddle.answer, answerVariants);

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const resolvedRiddleId = riddleId ?? (riddle as any).riddleId ?? riddle.id ?? null;

    let alreadyCompleted = false;
    if (isCorrect && user && resolvedRiddleId) {
      alreadyCompleted = await hasUserSolvedRiddle(user.id, resolvedRiddleId);
    }

    // Record attempt in DB (skip a duplicate "solved" row for the same riddle)
    if (resolvedRiddleId && !(isCorrect && alreadyCompleted)) {
      await insertAttempt({
        userId: user?.id ?? null,
        riddleId: resolvedRiddleId,
        submittedAnswer: userAnswer,
        isCorrect,
        status: isCorrect ? 'solved' : 'wrong'
      });
    }

    // Gamification — only for authenticated users on first correct solve of this riddle
    let solveResult = null;
    if (isCorrect && user && !alreadyCompleted) {
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

    let snapshotStreak: number | null = null;
    if (isCorrect && user && alreadyCompleted) {
      const { data: stats } = await supabase
        .from('user_stats')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();
      snapshotStreak = (stats as { current_streak: number } | null)?.current_streak ?? null;
    }

    return NextResponse.json({
      isCorrect,
      alreadyCompleted,
      message: isCorrect
        ? '🎉 Correct! Well done.'
        : '❌ Not quite. Try again or use a hint.',
      explanation: isCorrect ? riddle.explanation : null,
      answer: isCorrect ? riddle.answer : null,
      // Gamification payload — null for anon, incorrect, or repeat solve
      xpAwarded: alreadyCompleted ? 0 : (solveResult?.xpAwarded ?? null),
      newStreak: alreadyCompleted ? snapshotStreak : (solveResult?.newStreak ?? null),
      wasStreakReset: solveResult?.wasStreakReset ?? null,
      isStreakMilestone: solveResult?.isStreakMilestone ?? null,
      bonuses: alreadyCompleted ? [] : (solveResult?.bonuses ?? null),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: 'Invalid request', detail: String(e) }, { status: 400 });
  }
}
