import { getRecentRiddleQuestions } from '@/lib/riddles/queries';

/**
 * DB-backed deduplication check.
 * Compares the new riddle's question against the N most recent published riddles.
 * Uses Jaccard similarity on meaningful words (>3 chars).
 *
 * Replaces the old file-based dedupe that compared against a local JSON store.
 */

const SIMILARITY_THRESHOLD = 0.45; // 45% overlap = too similar (stricter for math)
const RECENT_LIMIT = 50;

function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );

  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 && setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

export interface DuplicateCheckResult {
  passed: boolean;
  reason?: string;
  similarity?: number;
}

/**
 * Returns { passed: false } if the new question is too similar to any recent riddle.
 * Fetches recent questions from Supabase on each call.
 */
export async function checkDuplication(
  newQuestion: string
): Promise<DuplicateCheckResult> {
  const recentQuestions = await getRecentRiddleQuestions(RECENT_LIMIT);

  for (const pastQuestion of recentQuestions) {
    const similarity = jaccardSimilarity(newQuestion, pastQuestion);
    if (similarity > SIMILARITY_THRESHOLD) {
      return {
        passed: false,
        reason: `Too similar to a recent riddle (${(similarity * 100).toFixed(1)}% overlap)`,
        similarity,
      };
    }
  }

  return { passed: true };
}
