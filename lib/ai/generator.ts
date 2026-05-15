import { AIRiddle } from '@/types/ai';
import { z } from 'zod';
import { TEMPLATE_REGISTRY, getRandomTemplate, getTemplate } from './templates/registry';

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
  model: string = PRIMARY_MODEL
): Promise<GenerateResponse> {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set.');

  const { getWeightedTemplates, getTemplate } = await import('./templates/registry');
  const selectedTemplates = getWeightedTemplates(difficulty, recentTemplateIds, 5);
  
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
        temperature: 0.8,
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
    // BULLETPROOF FALLBACK: Instead of failing the entire generation attempt because the AI hallucinated a parameter,
    // we intercept the failure and swap in the curated fallback parameters for the template it selected.
    const fallback = template.generateFallback();
    const { answer, explanation } = template.solve(fallback.params);
    return {
      success: true,
      rawResponse: rawContent + '\n\n[NOTE: AI params failed validation. Overrode with deterministic fallback parameters for chosen template.]',
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

export function generateDeterministicFallback(difficulty: string): GenerateResponse {
  const template = getRandomTemplate();
  const fallback = template.generateFallback();
  const { answer, explanation } = template.solve(fallback.params);

  return {
    success: true,
    rawResponse: JSON.stringify({ note: 'deterministic_fallback' }),
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
