import { z } from 'zod';
import { RiddleTemplate } from '../types';

export const mediumTemplates: RiddleTemplate<Record<string, number>>[] = [
  {
    id: 'medium_average_speed',
    name: 'Round Trip Average Speed',
    description: 'Calculates the true average speed of a round trip given two different speeds.',
    category: 'algebra',
    difficulty: ['medium'],
    paramsSchema: z.object({
      distance: z.number().int().min(10).max(200).multipleOf(10),
      v1: z.number().int().min(10).max(60).multipleOf(5),
      v2: z.number().int().min(20).max(120).multipleOf(5),
    }).refine(data => data.v1 !== data.v2, "Speeds must be different"),
    solve: ({ distance, v1, v2 }) => {
      const t1 = distance / v1;
      const t2 = distance / v2;
      const totalDistance = distance * 2;
      const totalTime = t1 + t2;
      const answer = (totalDistance / totalTime).toFixed(1);
      return {
        answer: answer.replace(/\.0$/, ''), // remove trailing .0
        explanation: `Average speed is total distance divided by total time. The trip there takes ${distance}/${v1} = ${t1} hours. The trip back takes ${distance}/${v2} = ${t2} hours. Total distance is ${totalDistance}. Total time is ${totalTime}. Average speed = ${totalDistance} / ${totalTime} = ${answer}.`
      };
    },
    generateFallback: () => ({
      params: { distance: 60, v1: 30, v2: 60 },
      wording: `A car travels to a city 60 miles away at 30 mph, and returns along the exact same route at 60 mph. What is the average speed for the entire round trip?`,
      hint1: 'Average speed is not simply the average of the two speeds.',
      hint2: 'Calculate the total distance and divide by the total time taken.'
    })
  },
  {
    id: 'medium_age_problem',
    name: 'Future Age Ratios',
    description: 'Calculates future ages using an initial difference and a future ratio.',
    category: 'algebra',
    difficulty: ['medium'],
    paramsSchema: z.object({
      diff: z.number().int().min(2).max(15),
      ratio: z.number().int().min(2).max(4),
    }),
    solve: ({ diff, ratio }) => {
      // Younger = y, Older = y + diff
      // Future: (y + diff + X) = ratio * (y + X)
      // This template finds the older person's future age when they are `ratio` times older.
      // ratio * Y_future = O_future
      // ratio * Y_future = Y_future + diff
      // Y_future * (ratio - 1) = diff
      // Y_future = diff / (ratio - 1)
      const yFuture = diff / (ratio - 1);
      const answer = yFuture * ratio; // Older person's future age
      
      // We need to ensure diff is divisible by (ratio - 1) for clean integers
      const safeYFuture = Math.floor(yFuture);
      const safeAnswer = safeYFuture * ratio;
      
      return {
        answer: safeAnswer.toString(),
        explanation: `The age difference is always ${diff}. If the older is ${ratio} times the younger's age, then Older = ${ratio} * Younger. Also, Older = Younger + ${diff}. So, ${ratio} * Younger = Younger + ${diff}, which means (${ratio}-1) * Younger = ${diff}. The younger's age is ${safeYFuture}, making the older's age ${safeAnswer}.`
      };
    },
    generateFallback: () => ({
      params: { diff: 10, ratio: 2 },
      wording: `Alice is exactly 10 years older than Bob. How old will Alice be when she is exactly twice as old as Bob?`,
      hint1: 'The difference in their ages never changes.',
      hint2: 'If Alice is twice as old, the difference between their ages is equal to Bob\'s age.'
    })
  }
];
