import StreakContent from '@/components/streak/StreakContent';
import { createClient } from '@/utils/supabase/server';
import type { UserStats } from '@/types/gamification';
import { redirect } from 'next/navigation';
import { computeStreakFromDates } from '@/lib/gamification/computeStreak';
import { toOfficialDateFromInstant, getOfficialDailyDate } from '@/lib/timezone';

export default async function StreakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let userStats: UserStats | null = null;

  // Fetch stats (used for XP, accuracy, etc. — NOT for streak truth)
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (stats) userStats = stats;

  // ── Derive solved dates from user_attempts (source of truth) ──
  // Fetch all solved attempts (up to 365 for best-streak calculation)
  const { data: attempts } = await supabase
    .from('user_attempts')
    .select('attempted_at')
    .eq('user_id', user.id)
    .eq('status', 'solved')
    .order('attempted_at', { ascending: false })
    .limit(365);

  // Extract timestamps
  const solvedTimestamps = (attempts ?? []).map(
    (a: { attempted_at: string }) => a.attempted_at
  );

  // Recompute streak dynamically from actual solved IST dates
  const computed = computeStreakFromDates(solvedTimestamps);

  // Deduplicate solved dates for calendar display
  const solvedDatesSet = new Set<string>();
  for (const ts of solvedTimestamps) {
    solvedDatesSet.add(toOfficialDateFromInstant(ts));
  }
  const solvedDates = Array.from(solvedDatesSet).sort().reverse();

  // Override cached stats with recomputed values
  const finalUserStats: UserStats = userStats ? {
    ...(userStats as any),
    current_streak: computed.currentStreak,
    best_streak: Math.max(computed.bestStreak, (userStats as any).best_streak ?? 0),
  } : {
    user_id: user.id,
    total_xp: 0,
    riddles_solved: 0,
    current_streak: computed.currentStreak,
    best_streak: computed.bestStreak,
    total_attempts: 0,
    correct_attempts: 0,
    hints_used: 0,
    last_solved_date: null,
    easy_solved: 0,
    medium_solved: 0,
    hard_solved: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const todayIST = getOfficialDailyDate();

  return <StreakContent userStats={finalUserStats} solvedDates={solvedDates} todayIST={todayIST} />;
}
