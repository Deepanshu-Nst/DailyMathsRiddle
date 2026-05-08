import type { DbRiddle } from '@/types/supabase';
import type { Riddle } from '@/types';

/**
 * Converts a DB riddle row to the client-safe Riddle type.
 * Strips: answer, answer_variants (never send to client).
 * Call this before returning from any public API route.
 */
export function toClientRiddle(db: DbRiddle): Omit<Riddle, 'answer' | 'answerVariants'> & {
  id: string;
  slug: string;
  category: string;
} {
  return {
    id: db.id,
    slug: db.slug,
    question: db.question,
    hint1: db.hint1,
    hint2: db.hint2,
    explanation: '',          // Never expose explanation before solve
    difficulty: db.difficulty as Riddle['difficulty'],
    category: db.category,
  };
}

/**
 * Converts a DB riddle row to the full Riddle type including answer.
 * Use ONLY on the server side for validation.
 */
export function toFullRiddle(db: DbRiddle): Riddle & { slug: string } {
  return {
    id: db.id,
    slug: db.slug,
    question: db.question,
    answer: db.answer,
    answerVariants: db.answer_variants ?? [],
    hint1: db.hint1,
    hint2: db.hint2,
    explanation: db.explanation,
    difficulty: db.difficulty as Riddle['difficulty'],
    category: db.category,
  };
}
