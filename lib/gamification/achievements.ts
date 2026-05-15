import { createServiceClient } from '@/utils/supabase/server';
import type { UserStats } from '@/types/gamification';

/** 
 * Checks for and unlocks new achievements for a user based on their current stats.
 * Returns the names of newly unlocked achievements.
 */
export async function checkAndUnlockAchievements(userId: string, stats: UserStats): Promise<string[]> {
  try {
    const supabase = (await createServiceClient()) as any;

    // 1. Fetch all possible achievements
    const { data: allAchievements, error: fetchErr } = await supabase
      .from('achievements')
      .select('*');

    if (fetchErr || !allAchievements) {
      console.error('[ACHIEVEMENT CHECK] fetch error:', fetchErr?.message);
      return [];
    }

    // 2. Fetch already unlocked achievements for this user
    const { data: unlocked, error: unlockedErr } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId);

    if (unlockedErr) {
      console.error('[ACHIEVEMENT CHECK] unlocked fetch error:', unlockedErr.message);
      return [];
    }

    const unlockedIds = new Set(((unlocked as Record<string, any>[]) || []).map(u => u.achievement_id));
    const newlyUnlocked: string[] = [];

    // 3. Evaluate each achievement
    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.id)) continue;

      let met = false;
      switch (achievement.requirement_type) {
        case 'first_solve':
          met = stats.riddles_solved >= achievement.threshold;
          break;
        case 'streak':
          met = stats.current_streak >= achievement.threshold;
          break;
        case 'xp':
          met = stats.total_xp >= achievement.threshold;
          break;
        case 'hard_solve':
          met = stats.hard_solved >= achievement.threshold;
          break;
        case 'accuracy':
          const accuracy = stats.total_attempts > 0 ? (stats.correct_attempts / stats.total_attempts) * 100 : 0;
          met = accuracy >= achievement.threshold && stats.riddles_solved >= 5; // e.g. min 5 solves for accuracy achievement
          break;
      }

      if (met) {
        // Unlock it!
        const { error: unlockErr } = await supabase
          .from('user_achievements')
          .insert({ user_id: userId, achievement_id: achievement.id });

        if (!unlockErr) {
          newlyUnlocked.push(achievement.name);
          console.log(`[ACHIEVEMENT UNLOCKED] "${achievement.name}" for user ${userId.slice(0, 8)}…`);
        } else {
          console.error(`[ACHIEVEMENT UNLOCK ERROR] "${achievement.name}":`, unlockErr.message);
        }
      }
    }

    return newlyUnlocked;
  } catch (err) {
    console.error('[checkAndUnlockAchievements] unexpected error:', err);
    return [];
  }
}
