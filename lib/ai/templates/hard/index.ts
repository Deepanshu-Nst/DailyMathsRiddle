import { z } from 'zod';
import { RiddleTemplate } from '../types';

export const hardTemplates: RiddleTemplate<Record<string, number>>[] = [
  {
    id: 'hard_set_intersection',
    name: 'Set Intersection (LCM)',
    description: 'Calculates the number of items divisible by both A and B within a given range.',
    category: 'number theory',
    difficulty: ['hard'],
    paramsSchema: z.object({
      a: z.number().int().min(2).max(12),
      b: z.number().int().min(3).max(15),
      limit: z.number().int().min(50).max(500),
    }).refine(data => data.a !== data.b, "Numbers must be different"),
    solve: ({ a, b, limit }) => {
      // Find GCD
      const gcd = (x: number, y: number): number => y === 0 ? x : gcd(y, x % y);
      const lcm = (a * b) / gcd(a, b);
      const answer = Math.floor(limit / lcm);
      return {
        answer: answer.toString(),
        explanation: `A number is divisible by both ${a} and ${b} if and only if it is divisible by their Least Common Multiple (LCM). The LCM of ${a} and ${b} is ${lcm}. Dividing the limit ${limit} by ${lcm} gives exactly ${answer} such numbers.`
      };
    },
    generateFallback: () => ({
      params: { a: 4, b: 6, limit: 100 },
      wording: `How many integers between 1 and 100 (inclusive) are divisible by both 4 and 6?`,
      hint1: 'Find the Least Common Multiple (LCM) of the two numbers first.',
      hint2: 'Divide the maximum range by the LCM and round down.'
    })
  },
  {
    id: 'hard_arithmetic_progression',
    name: 'Sum of Arithmetic Progression',
    description: 'Calculates the Nth term and Sum of an arithmetic sequence.',
    category: 'sequences',
    difficulty: ['hard'],
    paramsSchema: z.object({
      start: z.number().int().min(1).max(20),
      diff: z.number().int().min(2).max(15),
      n: z.number().int().min(10).max(100),
    }),
    solve: ({ start, diff, n }) => {
      const nthTerm = start + (n - 1) * diff;
      const sum = (n / 2) * (start + nthTerm);
      return {
        answer: sum.toString(),
        explanation: `The ${n}th term of the sequence is ${start} + (${n}-1)*${diff} = ${nthTerm}. The sum of the first ${n} terms is given by (N/2) * (first + last). So, (${n}/2) * (${start} + ${nthTerm}) = ${sum}.`
      };
    },
    generateFallback: () => ({
      params: { start: 2, diff: 3, n: 20 },
      wording: `Consider an arithmetic sequence that starts with 2 and increases by 3 each time (2, 5, 8, 11...). What is the sum of the first 20 numbers in this sequence?`,
      hint1: 'Use the formula for the sum of an arithmetic progression.',
      hint2: 'Find the 20th term first, then multiply the average of the first and last terms by 20.'
    })
  }
];
