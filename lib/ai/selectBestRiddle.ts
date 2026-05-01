import { generateRiddlesBatch } from './generator';
import { validateRiddle } from './validator';
import { passesRuleEngine } from './ruleEngine';
import { passesMathCheck } from './mathCheck';
import { passesDeduplication } from './dedupe';
import { riddleStore } from '../db/riddleStore';
import { AIRiddle, ScoredRiddle } from '@/types/ai';

export async function generateAndSelectBestRiddle(date: string, difficulty: string, retries = 2, batchSize = 5): Promise<AIRiddle | null> {
  const recentRiddles = await riddleStore.getRecent(30);

  for (let attempt = 0; attempt <= retries; attempt++) {
    console.log(`\n--- Generation Attempt ${attempt + 1}/${retries + 1} ---`);
    
    let generatedBatch: Partial<AIRiddle>[] = [];
    try {
      generatedBatch = await generateRiddlesBatch(difficulty, batchSize);
    } catch (err) {
      console.error("Generator failed:", err);
      continue;
    }

    // Process validations in parallel
    const validations = await Promise.all(
      generatedBatch.map(riddle => validateRiddle(riddle).catch(err => {
        console.error("Validation failed for a riddle:", err);
        return null;
      }))
    );

    const scoredCandidates: ScoredRiddle[] = [];

    for (let i = 0; i < generatedBatch.length; i++) {
      const riddle = generatedBatch[i];
      const validation = validations[i];

      if (!validation) continue; // Skip if validation API call failed completely

      // 1. Validator checks
      if (!validation.is_valid || validation.correctness_confidence < 0.75) {
        await riddleStore.logRejection(date, { riddle: riddle as AIRiddle, validation, overall_score: 0 }, "AI Validator Rejected");
        continue;
      }

      // 2. Rule Engine
      const ruleCheck = passesRuleEngine(riddle);
      if (!ruleCheck.passed) {
        await riddleStore.logRejection(date, { riddle: riddle as AIRiddle, validation, overall_score: 0 }, `Rule Engine: ${ruleCheck.reason}`);
        continue;
      }

      // 3. Math Check
      const mathCheck = passesMathCheck(riddle.question || '', riddle.answer || '', riddle.explanation || '');
      if (!mathCheck.passed) {
        await riddleStore.logRejection(date, { riddle: riddle as AIRiddle, validation, overall_score: 0 }, `Math Check: ${mathCheck.reason}`);
        continue;
      }

      // 4. Deduplication
      const dedupeCheck = passesDeduplication(riddle.question || '', recentRiddles);
      if (!dedupeCheck.passed) {
        await riddleStore.logRejection(date, { riddle: riddle as AIRiddle, validation, overall_score: 0 }, `Dedupe: ${dedupeCheck.reason}`);
        continue;
      }

      // Passed all checks! Calculate final score
      const overall_score = 
        (0.4 * validation.final_score) +
        (0.3 * validation.reasoning_depth_score) +
        (0.2 * validation.clarity_score) +
        (0.1 * validation.originality_score);

      scoredCandidates.push({
        riddle: riddle as AIRiddle,
        validation,
        overall_score
      });
    }

    if (scoredCandidates.length > 0) {
      // Sort by score descending
      scoredCandidates.sort((a, b) => b.overall_score - a.overall_score);
      const best = scoredCandidates[0];
      
      console.log(`Selected best riddle with score: ${best.overall_score}`);
      
      const finalRiddle: AIRiddle = {
        ...best.riddle,
        id: `ai-${date}-${difficulty}`, // ensure ID is set
        ai_generated: true,
        validation_score: best.overall_score,
        generated_at: new Date().toISOString(),
        validator_model: 'llama-3.3-70b-versatile',
        version: best.riddle.version || 'v1',
        generator_model: best.riddle.generator_model || 'llama-3.3-70b-versatile',
        answerVariants: best.riddle.answerVariants || [],
      };

      return finalRiddle;
    } else {
      console.log("No riddles passed safety layers in this batch.");
    }
  }

  // If we reach here, all retries failed
  console.error("All retries exhausted. Failed to generate a valid riddle.");
  return null;
}
