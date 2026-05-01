import { evaluate } from 'mathjs';

/**
 * mathCheck serves as a deterministic sanity check to catch hallucinations.
 */
export function passesMathCheck(question: string, answer: string, explanation: string): { passed: boolean; reason?: string } {
  // If the answer is purely numeric
  const numericAnswer = Number(answer.replace(/[^\d.-]/g, ''));

  if (!isNaN(numericAnswer) && answer.trim() !== '') {
    // Try to find math equations in the explanation that evaluate to the answer.
    // e.g., "5 * 4 = 20"
    // This is a rough heuristic. We look for expressions with =, +, -, *, /, ^
    const equations = explanation.match(/[\d\.\(\)\+\-\*\/\^]+\s*=\s*[\d\.]+/g);
    
    if (equations) {
      for (const eq of equations) {
        const [left, right] = eq.split('=');
        try {
          const evalLeft = evaluate(left.trim());
          const evalRight = Number(right.trim());
          
          if (Math.abs(evalLeft - evalRight) > 0.001) {
            return { passed: false, reason: `Math logic hallucination detected: ${eq} is false.` };
          }
          
          // If the equation evaluates correctly and matches the answer, strong signal!
          if (Math.abs(evalLeft - numericAnswer) < 0.001) {
             // Validated
          }
        } catch {
          // ignore parsing errors from natural language
        }
      }
    }
  }

  // Combinatorics sanity check
  // E.g., if question says "choose 3 from 5", answer should be <= 5!
  if (question.toLowerCase().includes('choose') && question.toLowerCase().includes('from')) {
    const nums = question.match(/\d+/g);
    if (nums && nums.length >= 2) {
      // Just a loose safety net
      const n = Math.max(...nums.map(Number));
      if (!isNaN(numericAnswer) && numericAnswer > factorial(n)) {
        return { passed: false, reason: "Combinatorics answer is impossibly large." };
      }
    }
  }

  return { passed: true };
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}
