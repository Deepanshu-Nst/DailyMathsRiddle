import { z } from 'zod';

export interface TemplateFallback {
  params: any;
  wording: string;
  hint1: string;
  hint2: string;
}

export interface RiddleTemplate<TParams = any> {
  id: string;
  name: string;
  description: string;
  category: 'arithmetic reasoning' | 'number theory' | 'patterns' | 'sequences' | 'algebra' | 'geometry' | 'probability';
  difficulty: ('easy' | 'medium' | 'hard')[];
  paramsSchema: z.ZodType<TParams>;
  solve: (params: TParams) => { answer: string; explanation: string };
  generateFallback: () => TemplateFallback;
}
