import { passesRuleEngine } from '@/lib/ai/ruleEngine';
import { passesMathCheck } from '@/lib/ai/mathCheck';
import type { AIRiddle } from '@/types/ai';

export interface StructuralCheckResult {
  passed: boolean;
  reason?: string;
}

/**
 * Runs all deterministic (non-AI) structural checks on a riddle candidate.
 * These run instantly — no API calls required.
 *
 * Checks (in order):
 * 1. Required fields present and non-empty
 * 2. Length constraints (question, explanation, answer)
 * 3. Answer appears in explanation (rule engine)
 * 4. No trivial arithmetic patterns (rule engine)
 * 5. Math equation consistency (mathCheck)
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

  // 3 & 4. Rule engine (answer in explanation + no trivial arithmetic)
  const ruleResult = passesRuleEngine(riddle);
  if (!ruleResult.passed) return { passed: false, reason: ruleResult.reason };

  // 5. Math consistency check
  const mathResult = passesMathCheck(q, a, expl);
  if (!mathResult.passed) return { passed: false, reason: mathResult.reason };

  return { passed: true };
}
