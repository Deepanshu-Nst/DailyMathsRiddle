import { riddleStore } from './db/riddleStore';
import { getRiddleByDateAndDifficulty } from './riddle-bank';
import { Riddle } from '@/types';

export async function getActiveRiddle(date: string, difficulty: string): Promise<Riddle> {
  // 1. Try DB (Cache handles this inherently in production if using KV/Redis, here we use local JSON)
  const dbRiddle = await riddleStore.getByDate(date, difficulty);
  
  if (dbRiddle) {
    return dbRiddle;
  }

  // 2. Fallback to hardcoded riddle bank
  return getRiddleByDateAndDifficulty(date, difficulty);
}
