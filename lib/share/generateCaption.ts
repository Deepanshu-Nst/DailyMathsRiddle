import { Riddle } from '@/types';

export const PLATFORM_LIMITS = {
  linkedin: 3000,
  whatsapp: 1000, // No strict short limit but keep it readable
};

interface CaptionInput {
  riddle: Partial<Riddle>;
  date: string;
  url: string;
}

export function generateLinkedInCaption({ riddle }: CaptionInput): string {
  return `🧠 Daily Intelligence Ritual

${riddle.question}

Can you solve it?

Drop your answer 👇

#ProblemSolving #AdvaitAI #DailyMathsRiddle`;
}

export function generateWhatsAppCaption({ riddle }: CaptionInput): string {
  return `Try this:

${riddle.question}

Think you can solve it?`;
}
