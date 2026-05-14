import type { AIRiddle } from '@/types/ai';

export interface StructuralCheckResult {
  passed: boolean;
  reason?: string;
}

/**
 * Checks that the explanation references the answer value.
 * Numeric-aware: "45 min" answer checks "45" in explanation.
 */
function answerAppearsInExplanation(answer: string, explanation: string): boolean {
  const expl = explanation.toLowerCase();
  const ans = answer.toLowerCase().trim();

  if (expl.includes(ans)) return true;

  const numericTokens = ans.match(/\d+(\.\d+)?/g);
  if (numericTokens && numericTokens.length > 0) {
    return numericTokens.every((n) => expl.includes(n));
  }

  return expl.includes(ans);
}

/**
 * Runs fast, deterministic structural checks on a riddle candidate.
 * No API calls — all instant.
 *
 * Deliberately DOES NOT run mathCheck (passesMathCheck).
 *
 * Why: mathCheck uses regex to parse math equations from explanation prose.
 * It consistently produces false positives — it treats prose like
 * "12 students … 15 days" as the equation "12 = 15 is false", rejecting
 * perfectly valid riddles. It also cannot handle factorials, modular
 * arithmetic, or multi-line step-by-step explanations.
 *
 * Math correctness is validated by the AI validator (validateRiddle)
 * which runs with correctness_confidence >= 0.75. That is the right
 * layer for semantic math validation.
 *
 * Checks performed:
 * 1. Required fields present and non-empty
 * 2. Length constraints
 * 3. Answer appears in explanation (numeric-aware)
 * 4. Reject genuinely trivial bare arithmetic questions
 */
export function runStructuralChecks(
  riddle: Partial<AIRiddle>
): StructuralCheckResult {
  const q = (riddle.question ?? '').trim();
  const a = (riddle.answer ?? '').trim();
  const expl = (riddle.explanation ?? '').trim();

  // 1. Required fields
  if (!q) return { passed: false, reason: 'Missing question' };
  if (!a) return { passed: false, reason: 'Missing answer' };
  if (!expl) return { passed: false, reason: 'Missing explanation' };

  // 2. Length constraints
  if (q.length < 20) return { passed: false, reason: 'Question too short (<20 chars)' };
  if (a.length > 120) return { passed: false, reason: 'Answer too long (>120 chars)' };
  if (expl.length < 40) return { passed: false, reason: 'Explanation too short (<40 chars)' };

  // 3. Answer must appear in explanation (numeric-aware)
  if (!answerAppearsInExplanation(a, expl)) {
    return { passed: false, reason: 'Explanation does not reference the answer value' };
  }

  // 4. Reject bare trivial arithmetic (e.g. "What is 5 + 3?")
  // Only matches if the ENTIRE question is a simple expression — not word problems
  const strippedQ = q.replace(/^(what is|calculate|compute|find|solve)\s+/i, '').trim();
  if (/^\d+\s*[\+\-\*\/]\s*\d+\s*\??$/.test(strippedQ)) {
    return { passed: false, reason: 'Question is trivial bare arithmetic' };
  }

  return { passed: true };
}
