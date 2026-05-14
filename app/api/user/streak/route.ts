import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/** GET /api/user/streak — returns current_streak, best_streak, and recent events. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [statsRes, eventsRes] = await Promise.all([
    supabase
      .from('user_stats')
      .select('current_streak, best_streak, last_solved_date')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('streak_events')
      .select('event_type, streak_value, solved_date, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const s = statsRes.data as any;
  return NextResponse.json({
    current_streak:   s?.current_streak   ?? 0,
    best_streak:      s?.best_streak       ?? 0,
    last_solved_date: s?.last_solved_date  ?? null,
    events: eventsRes.data ?? [],
  });
}
