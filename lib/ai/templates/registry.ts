import { RiddleTemplate } from './types';
import { easyTemplates } from './easy';
import { mediumTemplates } from './medium';
import { hardTemplates } from './hard';

const ALL_TEMPLATES = [...easyTemplates, ...mediumTemplates, ...hardTemplates];

export const TEMPLATE_REGISTRY: Record<string, RiddleTemplate<Record<string, number>>> = {};

ALL_TEMPLATES.forEach(t => {
  TEMPLATE_REGISTRY[t.id] = t;
});

export function getTemplate(id: string): RiddleTemplate<Record<string, number>> | null {
  return TEMPLATE_REGISTRY[id] || null;
}

export function getRandomTemplate(difficulty?: string, avoidIds: string[] = []): RiddleTemplate<Record<string, number>> {
  let pool = ALL_TEMPLATES;
  if (difficulty) {
    pool = ALL_TEMPLATES.filter(t => t.difficulty.includes(difficulty as 'easy' | 'medium' | 'hard'));
  }
  // Exclude recently used templates for diversity
  if (avoidIds.length > 0) {
    const filtered = pool.filter(t => !avoidIds.includes(t.id));
    if (filtered.length > 0) pool = filtered; // Only apply if we still have options
  }
  if (pool.length === 0) pool = ALL_TEMPLATES; // ultimate fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Selects a weighted subset of templates for the AI prompt.
 * Templates recently used have a heavily reduced chance of being selected.
 */
export function getWeightedTemplates(
  difficulty: string, 
  recentTemplateIds: string[], 
  count: number = 5,
  avoidCategories: string[] = []
): RiddleTemplate<Record<string, number>>[] {
  let pool = ALL_TEMPLATES.filter(t => 
    t.difficulty.includes(difficulty as 'easy' | 'medium' | 'hard') &&
    !avoidCategories.includes(t.category.toLowerCase())
  );

  // If strict category avoidance leaves us with too few templates, relax the constraint
  if (pool.length < count) {
    pool = ALL_TEMPLATES.filter(t => t.difficulty.includes(difficulty as 'easy' | 'medium' | 'hard'));
  }
  
  if (pool.length <= count) {
    return pool;
  }

  // Assign weights
  const weightedPool = pool.map(t => {
    let weight = 100;
    
    // Penalize or exclude recently used templates
    const recentIndex = recentTemplateIds.indexOf(t.id);
    if (recentIndex !== -1) {
      if (recentIndex < 3 && pool.length > count + 3) {
        weight = 0; // Strictly exclude the 3 most recent if we have enough templates
      } else {
        const penalty = Math.max(1, 10 - recentIndex);
        weight = weight / (penalty * 20); // extreme reduction
      }
    }

    return { template: t, weight };
  }).filter(item => item.weight > 0);

  // Select `count` templates without replacement using weighted random
  const selected: RiddleTemplate<Record<string, number>>[] = [];
  
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
