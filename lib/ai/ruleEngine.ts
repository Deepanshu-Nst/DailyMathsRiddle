import { AIRiddle } from '@/types/ai';

export function passesRuleEngine(riddle: Partial<AIRiddle>): { passed: boolean; reason?: string } {
  // 1. Check for missing required fields
  const requiredFields = ['question', 'answer', 'explanation', 'difficulty', 'category'];
  for (const field of requiredFields) {
    if (!riddle[field as keyof AIRiddle]) {
      return { passed: false, reason: `Missing required field: ${field}` };
    }
  }

  const q = riddle.question!.toLowerCase();
  const a = riddle.answer!.toLowerCase();
  const expl = riddle.explanation!.toLowerCase();

  // 2. Reject trivial patterns (very basic arithmetic)
  if (q.match(/\b\d+\s*[\+\-\*\/]\s*\d+\b/)) {
    // If it looks like "5 + 3" or "10 / 2" directly in the question, reject
    // Unless it's part of a larger complex word problem, but ruthless IIT professor says REJECT
    return { passed: false, reason: "Question contains trivial arithmetic patterns." };
  }

  // 3. Ensure the answer is actually present in the explanation
  // Strip punctuation for matching
  const cleanAnswer = a.replace(/[^\w\s]/g, '').trim();
  const cleanExpl = expl.replace(/[^\w\s]/g, '').trim();

  // We look for the exact string of the answer inside the explanation.
  // E.g. answer "15", explanation should contain "15".
  if (!cleanExpl.includes(cleanAnswer) && !expl.includes(a)) {
    return { passed: false, reason: "The explanation does not explicitly state the answer." };
  }

  return { passed: true };
}
