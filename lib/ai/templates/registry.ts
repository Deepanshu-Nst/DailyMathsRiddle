import { RiddleTemplate } from './types';
import { easyTemplates } from './easy';
import { mediumTemplates } from './medium';
import { hardTemplates } from './hard';

const ALL_TEMPLATES = [...easyTemplates, ...mediumTemplates, ...hardTemplates];

export const TEMPLATE_REGISTRY: Record<string, RiddleTemplate<any>> = {};

ALL_TEMPLATES.forEach(t => {
  TEMPLATE_REGISTRY[t.id] = t;
});

export function getTemplate(id: string): RiddleTemplate<any> | null {
  return TEMPLATE_REGISTRY[id] || null;
}

export function getRandomTemplate(difficulty?: string): RiddleTemplate<any> {
  let pool = ALL_TEMPLATES;
  if (difficulty) {
    pool = ALL_TEMPLATES.filter(t => t.difficulty.includes(difficulty as any));
  }
  if (pool.length === 0) pool = ALL_TEMPLATES; // fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Selects a weighted subset of templates for the AI prompt.
 * Templates recently used have a heavily reduced chance of being selected.
 */
export function getWeightedTemplates(difficulty: string, recentTemplateIds: string[], count: number = 5): RiddleTemplate<any>[] {
  const pool = ALL_TEMPLATES.filter(t => t.difficulty.includes(difficulty as any));
  
  if (pool.length <= count) {
    return pool;
  }

  // Assign weights
  const weightedPool = pool.map(t => {
    let weight = 100;
    
    // Penalize recently used templates
    const recentIndex = recentTemplateIds.indexOf(t.id);
    if (recentIndex !== -1) {
      // If it's the most recent (index 0), massive penalty. If it's 10th most recent, smaller penalty.
      const penalty = Math.max(1, 10 - recentIndex);
      weight = weight / (penalty * 10); // drastic reduction
    }

    return { template: t, weight };
  });

  // Select `count` templates without replacement using weighted random
  const selected: RiddleTemplate<any>[] = [];
  
  for (let i = 0; i < count; i++) {
    if (weightedPool.length === 0) break;

    const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
    let r = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let j = 0; j < weightedPool.length; j++) {
      r -= weightedPool[j].weight;
      if (r <= 0) {
        chosenIndex = j;
        break;
      }
    }

    selected.push(weightedPool[chosenIndex].template);
    weightedPool.splice(chosenIndex, 1); // Remove so we don't pick it again
  }

  return selected;
}
