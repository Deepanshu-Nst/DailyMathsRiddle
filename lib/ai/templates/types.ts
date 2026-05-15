import { z } from 'zod';

export interface TemplateFallback<TParams = Record<string, unknown>> {
  params: TParams;
  wording: string;
  hint1: string;
  hint2: string;
}

export interface RiddleTemplate<TParams = Record<string, unknown>> {
  id: string;
  name: string;
  description: string;
  category: 'arithmetic reasoning' | 'number theory' | 'patterns' | 'sequences' | 'algebra' | 'geometry' | 'probability';
  difficulty: ('easy' | 'medium' | 'hard')[];
  paramsSchema: z.ZodType<TParams>;
  solve: (params: TParams) => { answer: string; explanation: string };
  generateFallback: () => TemplateFallback<TParams>;
}
