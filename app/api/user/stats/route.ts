import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/** GET /api/user/stats — returns full user_stats row. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }


  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    // No stats yet — return zero state
    return NextResponse.json({
      user_id: user.id,
      total_xp: 0, current_streak: 0, best_streak: 0,
      riddles_solved: 0, easy_solved: 0, medium_solved: 0, hard_solved: 0,
      total_attempts: 0, correct_attempts: 0, last_solved_date: null,
    });
  }

  return NextResponse.json(data);
}
