import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { traceSocialAction } from '@/lib/analytics/pipelineEvents';

/** GET /api/leaderboard?type=xp|streak|accuracy|hard&limit=50 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'xp';
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

  traceSocialAction('leaderboard_fetch', { type, limit });

  const supabase = await createClient();

  let query = supabase
    .from('user_stats')
    .select(`
      user_id,
      total_xp,
      current_streak,
      best_streak,
      riddles_solved,
      hard_solved,
      correct_attempts,
      total_attempts,
      profiles (
        username,
        full_name,
        avatar_url
      )
    `);

  // Sorting logic
  if (type === 'xp') {
    query = query.order('total_xp', { ascending: false });
  } else if (type === 'streak') {
    query = query.order('current_streak', { ascending: false });
  } else if (type === 'hard') {
    query = query.order('hard_solved', { ascending: false });
  } else if (type === 'accuracy') {
    // Note: Accuracy isn't a direct column, it's (correct/total).
    // For simple implementation, we'll fetch then sort in JS or use a computed column/view.
    // For now, let's sort by correct_attempts as a proxy or fetch extra and sort.
    query = query.order('correct_attempts', { ascending: false });
  }

  const { data, error } = await query.limit(limit);

  if (error) {
    console.error('[LEADERBOARD ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }

  // Post-process to calculate accuracy and filter out users without usernames if desired
  const results = data.map((row: any) => ({
    user_id: row.user_id,
    username: row.profiles?.username || row.profiles?.full_name?.split(' ')[0] || 'Anonymous',
    avatar_url: row.profiles?.avatar_url,
    total_xp: row.total_xp,
    current_streak: row.current_streak,
    best_streak: row.best_streak,
    riddles_solved: row.riddles_solved,
    hard_solved: row.hard_solved,
    accuracy: row.total_attempts > 0 ? (row.correct_attempts / row.total_attempts) : 0,
  }));

  if (type === 'accuracy') {
    results.sort((a, b) => b.accuracy - a.accuracy);
  }

  return NextResponse.json(results);
}
