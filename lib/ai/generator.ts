import { AIRiddle } from '@/types/ai';
import { z } from 'zod';
import { getRandomTemplate } from './templates/registry';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export const PRIMARY_MODEL = 'llama-3.3-70b-versatile';
export const FAST_MODEL = 'llama-3.1-8b-instant';

const DIFFICULTY_GUIDELINES: Record<string, string> = {
  easy: 'Simple scenarios. Direct application of the formula.',
  medium: 'Moderate scenarios. Slight twists or distractions in the wording.',
  hard: 'Complex scenarios. The parameter values might be large, or the wording might be very tricky.',
};

export type GenerationMode = 'freeform' | 'templated' | 'deterministic_fallback';

export type GenerateResponse =
  | { success: true; riddle: Partial<AIRiddle>; rawResponse: string; generationMode: GenerationMode; templateFamily: string | null }
  | { success: false; rawResponse: string; stage: 'parse_error' | 'structural_rejected'; reason: string; generationMode: GenerationMode; templateFamily: string | null };

export function parseGroqRetryDelay(headers: Headers, errorBody?: string): number {
  const resetTokens = headers.get('x-ratelimit-reset-tokens');
  if (resetTokens) {
    const msMatch = resetTokens.match(/([\d.]+)ms/);
    if (msMatch) return Math.ceil(parseFloat(msMatch[1])) + 1000;
    const sMatch = resetTokens.match(/([\d.]+)s/);
    if (sMatch) return Math.ceil(parseFloat(sMatch[1]) * 1000) + 1000;
  }
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const secs = parseFloat(retryAfter);
    if (!isNaN(secs)) return Math.ceil(secs * 1000) + 1000;
  }
  if (errorBody) {
    const match = errorBody.match(/try again in ([\d.]+)s/i);
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000;
  }
  return 20_000;
}

function extractJson(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) return match[1];
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return null;
}

export async function generateSingleRiddle(
  difficulty: string,
  recentTemplateIds: string[] = [],
  model: string = PRIMARY_MODEL,
  avoidCategories: string[] = []
): Promise<GenerateResponse> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');

  const { getWeightedTemplates, getTemplate } = await import('./templates/registry');
  const selectedTemplates = getWeightedTemplates(difficulty, recentTemplateIds, 5, avoidCategories.map(c => c.toLowerCase()));
  
  if (selectedTemplates.length === 0) {
    throw new Error(`No templates found for difficulty: ${difficulty}`);
  }

  // Construct template info
  const templateInfos = selectedTemplates.map(t => {
    // Extract parameter keys from the Zod schema
    const shape = (t.paramsSchema as z.ZodObject<z.ZodRawShape>).shape || {};
    const paramsKeys = Object.keys(shape);
    return `- ID: "${t.id}" | Category: ${t.category}\n  Description: ${t.description}\n  Required Params: { ${paramsKeys.map(k => `${k}: number`).join(', ')} }`;
  });

  const prompt = `You are a riddle wording engine. We use a deterministic template system.
You must select ONE template, generate valid parameters for it, and write the wording of the riddle.

AVAILABLE TEMPLATES:
${templateInfos.join('\n\n')}

Difficulty: ${difficulty}
Level: ${DIFFICULTY_GUIDELINES[difficulty] ?? difficulty}

STRICT CONSTRAINTS:
1. "templateId" MUST be exactly one of the available template IDs.
2. "params" MUST be a JSON object containing the required numerical parameters for the template. Make sure they are integers and reasonable.
3. "wording" MUST be the actual riddle question text.
4. "hint1" and "hint2" MUST be concise hints (2-5 sentences max).
5. IMPORTANT: Use DIFFERENT parameter values than typical examples. Be creative with the numbers.
${avoidCategories.length > 0 ? `6. TOPIC DIVERSITY: Do NOT generate riddles related to these recent categories: ${avoidCategories.join(', ')}. Use a DIFFERENT mathematical domain.` : ''}

Return ONLY valid JSON in this exact schema. No markdown, no prose outside JSON.
{
  "templateId": "string",
  "params": { ... },
  "wording": "string",
  "hint1": "string",
  "hint2": "string"
}`;

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, // Increased from 0.8 for more diversity
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (err: unknown) {
    throw err;
  }

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`Groq ${response.status}: ${body}`);
    (err as Error & { groqHeaders: Headers }).groqHeaders = response.headers;
    (err as Error & { groqBody: string }).groqBody = body;
    throw err;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || '';

  const jsonStr = extractJson(rawContent);
  if (!jsonStr) {
    return { success: false, rawResponse: rawContent, stage: 'parse_error', reason: 'Could not extract JSON from response.', generationMode: 'templated', templateFamily: null };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { success: false, rawResponse: rawContent, stage: 'parse_error', reason: 'Invalid JSON syntax.', generationMode: 'templated', templateFamily: null };
  }

  const templateId = typeof parsed.templateId === 'string' ? parsed.templateId : '';
  const template = getTemplate(templateId);
  if (!template) {
    return { success: false, rawResponse: rawContent, stage: 'structural_rejected', reason: `Invalid templateId: ${templateId}`, generationMode: 'templated', templateFamily: templateId || null };
  }

  const paramsValidation = template.paramsSchema.safeParse(parsed.params);
  if (!paramsValidation.success) {
    // BULLETPROOF FALLBACK: Use randomized params instead of static fallback
    const randomParams = generateRandomParams(template);
    if (randomParams) {
      const { answer, explanation } = template.solve(randomParams.params);
      return {
        success: true,
        rawResponse: rawContent + '\n\n[NOTE: AI params failed validation. Generated random valid parameters.]',
        generationMode: 'deterministic_fallback',
        templateFamily: template.id,
        riddle: {
          question: randomParams.wording,
          answer,
          explanation,
          hint1: randomParams.hint1,
          hint2: randomParams.hint2,
          difficulty: difficulty as 'easy' | 'medium' | 'hard',
          category: template.category,
          version: 'v2_param_fallback',
          generator_model: model,
        }
      };
    }
    // If random params generation fails, use static fallback
    const fallback = template.generateFallback();
    const { answer, explanation } = template.solve(fallback.params);
    return {
      success: true,
      rawResponse: rawContent + '\n\n[NOTE: AI params failed validation. Used static fallback.]',
      generationMode: 'deterministic_fallback',
      templateFamily: template.id,
      riddle: {
        question: fallback.wording,
        answer,
        explanation,
        hint1: fallback.hint1,
        hint2: fallback.hint2,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        category: template.category,
        version: 'v2_param_fallback',
        generator_model: model,
      }
    };
  }

  const { answer, explanation } = template.solve(paramsValidation.data);

  return {
    success: true,
    rawResponse: rawContent,
    generationMode: 'templated',
    templateFamily: templateId,
    riddle: {
      question: parsed.wording as string,
      answer,
      explanation,
      hint1: parsed.hint1 as string,
      hint2: parsed.hint2 as string,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      category: template.category,
      version: 'v2',
      generator_model: model,
    }
  };
}

// ── Randomized deterministic fallback ────────────────────────────

/**
 * Generates random valid parameters for a template by inspecting its Zod schema.
 * Returns randomized wording to avoid content-identical output.
 */
function generateRandomParams(template: { id: string; paramsSchema: z.ZodType<Record<string, number>>; solve: (p: Record<string, number>) => { answer: string; explanation: string }; generateFallback: () => { params: Record<string, number>; wording: string; hint1: string; hint2: string } }): { params: Record<string, number>; wording: string; hint1: string; hint2: string } | null {
  try {
    const fallback = template.generateFallback();
    const shape = (template.paramsSchema as z.ZodObject<z.ZodRawShape>).shape;
    if (!shape) return null;

    const params: Record<string, number> = {};
    
    for (const [key, schema] of Object.entries(shape)) {
      const zodNum = schema as z.ZodNumber;
      // Try to extract min/max from Zod checks
      let min = 1, max = 100, multipleOf = 1;
      
      if ('_def' in zodNum && zodNum._def && 'checks' in zodNum._def) {
        for (const check of (zodNum._def as any).checks ?? []) {
          if (check.kind === 'min') min = check.value;
          if (check.kind === 'max') max = check.value;
          if (check.kind === 'multipleOf') multipleOf = check.value;
        }
      }

      // Generate random value within range, respecting multipleOf
      const range = Math.floor((max - min) / multipleOf);
      const randomIndex = Math.floor(Math.random() * (range + 1));
      params[key] = min + randomIndex * multipleOf;
    }

    // Validate the random params
    const validation = template.paramsSchema.safeParse(params);
    if (!validation.success) {
      // If random params fail validation (e.g. refinement like v1 !== v2), 
      // try tweaking one parameter
      for (const [key] of Object.entries(shape)) {
        const tweaked = { ...params, [key]: params[key] + 5 };
        const retry = template.paramsSchema.safeParse(tweaked);
        if (retry.success) {
          const { answer } = template.solve(retry.data);
          return {
            params: retry.data,
            wording: generateDynamicWording(template.id, retry.data),
            hint1: fallback.hint1,
            hint2: fallback.hint2,
          };
        }
      }
      return null; // All tweaks failed
    }

    const { answer } = template.solve(validation.data);
    return {
      params: validation.data,
      wording: generateDynamicWording(template.id, validation.data),
      hint1: fallback.hint1,
      hint2: fallback.hint2,
    };
  } catch {
    return null;
  }
}

/**
 * Generates dynamic wording for common template types based on their params.
 * This avoids the static "A car travels 60 miles..." repetition.
 */
function generateDynamicWording(templateId: string, params: Record<string, number>): string {
  switch (templateId) {
    case 'medium_average_speed':
      return `A car drives to a destination ${params.distance} miles away at ${params.v1} mph, and returns at ${params.v2} mph. What is the average speed for the entire round trip?`;
    case 'medium_age_problem':
      return `A person is exactly ${params.diff} years older than another. At what age will the older person be exactly ${params.ratio} times as old as the younger?`;
    case 'hard_set_intersection': {
      const a = params.setA ?? params.a;
      const b = params.setB ?? params.b;
      const both = params.both ?? params.intersection;
      return `In a group of people, ${a} enjoy activity A and ${b} enjoy activity B. If ${both} enjoy both, how many enjoy at least one?`;
    }
    case 'hard_arithmetic_progression': {
      const first = params.first ?? params.a;
      const diff = params.diff ?? params.d;
      const n = params.n ?? params.terms;
      return `An arithmetic sequence starts at ${first} with a common difference of ${diff}. What is the sum of the first ${n} terms?`;
    }
    default: {
      // Generic fallback: construct from params
      const paramStr = Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ');
      return `Given ${paramStr}, solve this ${templateId.replace(/_/g, ' ')} problem.`;
    }
  }
}

/**
 * Deterministic fallback with randomized params and cross-difficulty borrowing.
 * If the pool for the requested difficulty is exhausted (all templates excluded),
 * borrows from adjacent difficulties to avoid repetition.
 */
export function generateDeterministicFallback(difficulty: string, avoidTemplateIds: string[] = []): GenerateResponse {
  // Try primary difficulty first
  let template = getRandomTemplate(difficulty, avoidTemplateIds);
  
  // If the selected template is in the avoid list (pool exhausted), try cross-difficulty
  if (avoidTemplateIds.includes(template.id)) {
    const adjacentDifficulties = difficulty === 'medium' 
      ? ['easy', 'hard'] 
      : difficulty === 'easy' 
        ? ['medium', 'hard'] 
        : ['medium', 'easy'];
    
    for (const altDiff of adjacentDifficulties) {
      const altTemplate = getRandomTemplate(altDiff, avoidTemplateIds);
      if (!avoidTemplateIds.includes(altTemplate.id)) {
        template = altTemplate;
        console.log(`[deterministic_fallback] Cross-difficulty borrow: ${altDiff} template ${altTemplate.id} for ${difficulty}`);
        break;
      }
    }
  }

  // Try randomized params first
  const randomResult = generateRandomParams(template);
  if (randomResult) {
    const { answer, explanation } = template.solve(randomResult.params);
    return {
      success: true,
      rawResponse: JSON.stringify({ note: 'deterministic_fallback_randomized', params: randomResult.params }),
      generationMode: 'deterministic_fallback',
      templateFamily: template.id,
      riddle: {
        question: randomResult.wording,
        answer,
        explanation,
        hint1: randomResult.hint1,
        hint2: randomResult.hint2,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        category: template.category,
        version: 'v2_fallback_random',
        generator_model: 'deterministic_fallback',
      }
    };
  }

  // Ultimate fallback: static params
  const fallback = template.generateFallback();
  const { answer, explanation } = template.solve(fallback.params);

  return {
    success: true,
    rawResponse: JSON.stringify({ note: 'deterministic_fallback_static' }),
    generationMode: 'deterministic_fallback',
    templateFamily: template.id,
    riddle: {
      question: fallback.wording,
      answer,
      explanation,
      hint1: fallback.hint1,
      hint2: fallback.hint2,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      category: template.category,
      version: 'v2_fallback',
      generator_model: 'deterministic_fallback',
    }
  };
}

export async function generateRiddlesBatch(
  difficulty: string,
  count: number = 1,
  recentQuestions: string[] = []
): Promise<Partial<AIRiddle>[]> {
  const results: Partial<AIRiddle>[] = [];
  for (let i = 0; i < count; i++) {
    const r = await generateSingleRiddle(difficulty, recentQuestions);
    if (r.success) results.push(r.riddle);
  }
  return results;
}
