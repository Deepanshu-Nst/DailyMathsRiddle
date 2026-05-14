import StreakContent from '@/components/streak/StreakContent';
import { createClient } from '@/utils/supabase/server';
import type { UserStats } from '@/types/gamification';
import { redirect } from 'next/navigation';

export default async function StreakPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let userStats: UserStats | null = null;
  let solvedDates: string[] = [];

  // Fetch stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();
    
  if (stats) userStats = stats;

  // Fetch solved dates for calendar
  const { data: events } = await supabase
    .from('streak_events')
    .select('solved_date')
    .eq('user_id', user.id)
    .order('solved_date', { ascending: false })
    .limit(30);
    
  if (events) {
    solvedDates = (events as Array<{ solved_date: string }>).map(e => e.solved_date);
  }

  return <StreakContent userStats={userStats} solvedDates={solvedDates} />;
}
