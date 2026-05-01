import { AIRiddle } from '@/types/ai';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';

export async function generateRiddlesBatch(difficulty: string, count: number = 5): Promise<Partial<AIRiddle>[]> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

  const prompt = `You are an expert math problem creator. Generate ${count} non-trivial, reasoning-based riddles for difficulty level: ${difficulty}.
Avoid basic arithmetic. Focus on logic, combinatorics, patterns.
Return a STRICT JSON object containing a "riddles" array. Do not wrap in markdown blocks, just raw JSON.

Format:
{
  "riddles": [
    {
      "question": "string",
      "answer": "string (the precise short answer, e.g. '15' or '45 min')",
      "answerVariants": ["array of strings (alternative acceptable answers)"],
      "hint1": "string",
      "hint2": "string",
      "explanation": "string (step by step reasoning leading to the answer)",
      "difficulty": "${difficulty}",
      "category": "string (e.g. Logic, Combinatorics, Probability, Series)"
    }
  ]
}`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" } // Using groq json mode if we wrap in an object, wait, groq json mode requires 'json' in prompt
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    // If it wrapped it in an object like { riddles: [...] }
    const parsed = JSON.parse(content);
    const riddles = Array.isArray(parsed) ? parsed : (parsed.riddles || Object.values(parsed)[0]);
    
    if (!Array.isArray(riddles)) {
      throw new Error("Failed to extract array from JSON");
    }

    return riddles.map((r: any) => ({
      ...r,
      version: "v1",
      generator_model: MODEL
    }));
  } catch (err) {
    throw new Error(`Failed to parse Groq response: ${content}`);
  }
}
