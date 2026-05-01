import { AIRiddle } from '@/types/ai';

/**
 * Calculates Jaccard similarity between two strings (word overlap)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3));

  if (words1.size === 0 && words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

export function passesDeduplication(newQuestion: string, recentRiddles: AIRiddle[]): { passed: boolean; reason?: string } {
  const THRESHOLD = 0.4; // 40% similarity is too high

  for (const past of recentRiddles) {
    const similarity = calculateSimilarity(newQuestion, past.question);
    if (similarity > THRESHOLD) {
      return { 
        passed: false, 
        reason: `Too similar to a recent riddle (Similarity: ${(similarity * 100).toFixed(1)}%).` 
      };
    }
  }

  return { passed: true };
}
