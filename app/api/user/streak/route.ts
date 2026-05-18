import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { computeStreakFromDates } from '@/lib/gamification/computeStreak';
import { toOfficialDateFromInstant } from '@/lib/timezone';

/** GET /api/user/streak — returns current_streak, best_streak, and recent events. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [statsRes, attemptsRes, eventsRes] = await Promise.all([
    supabase
      .from('user_stats')
      .select('best_streak, last_solved_date')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('user_attempts')
      .select('attempted_at')
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .order('attempted_at', { ascending: false })
      .limit(365),
    supabase
      .from('streak_events')
      .select('event_type, streak_value, solved_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const solvedTimestamps = (attemptsRes.data ?? []).map(
    (a: { attempted_at: string }) => a.attempted_at
  );

  const computed = computeStreakFromDates(solvedTimestamps);

  const s = statsRes.data as any;
  return NextResponse.json({
    current_streak: computed.currentStreak,
    best_streak: Math.max(computed.bestStreak, s?.best_streak ?? 0),
    last_solved_date: s?.last_solved_date ?? null,
    events: eventsRes.data ?? [],
    solved_dates: computed.solvedDates, // Include actual solved dates
  });
}
