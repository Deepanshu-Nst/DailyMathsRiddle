import { ValidationResult } from '@/types/ai';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = 'llama-3.3-70b-versatile';

export async function validateRiddle(riddle: any): Promise<ValidationResult> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

  const prompt = `You are a ruthless IIT professor evaluating math riddles submitted by your students.
Your job is to critically evaluate this riddle. If there is ANY doubt in correctness, clarity, or logic, mark it invalid.
Do NOT be lenient. You must reject trivial arithmetic or ambiguous riddles.

Riddle to evaluate:
Question: ${riddle.question}
Answer: ${riddle.answer}
Explanation: ${riddle.explanation}
Difficulty: ${riddle.difficulty}
Category: ${riddle.category}

Return a STRICT JSON object matching this schema exactly:
{
  "is_valid": boolean (false if any flaw exists),
  "difficulty_match": boolean (does it match the requested difficulty level?),
  "correctness_confidence": number (0.0 to 1.0, must be 1.0 to pass),
  "reasoning_depth_score": number (1 to 10),
  "clarity_score": number (1 to 10),
  "originality_score": number (1 to 10),
  "issues": ["array of strings detailing any flaws found"],
  "final_score": number (0 to 10)
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
      temperature: 0.1, // very deterministic and strict
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`Groq Validator Error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const result = JSON.parse(content) as ValidationResult;
    return result;
  } catch (err) {
    throw new Error(`Failed to parse Validator response: ${content}`);
  }
}
