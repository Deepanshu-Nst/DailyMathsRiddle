import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOfficialDailyDate, toOfficialDateFromInstant } from '@/lib/timezone';
import { UserSessionState, DailySolvedEntry } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const today = getOfficialDailyDate();

    const baseState: UserSessionState = {
      user: null,
      streak: { currentStreak: 0, bestStreak: 0, totalXP: 0, totalSolved: 0 },
      solvedToday: false,
      solvedRiddleIds: [],
      activityMap: [],
    };

    if (!user) {
      return NextResponse.json(baseState);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single() as { data: { username: string | null; avatar_url: string | null } | null };

    baseState.user = {
      id: user.id,
      username: profile?.username ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };

    const { data: stats } = await supabase
      .from('user_stats')
      .select('current_streak, best_streak, total_xp, riddles_solved, last_solved_date')
      .eq('user_id', user.id)
      .maybeSingle() as { data: {
        current_streak: number | null;
        best_streak: number | null;
        total_xp: number | null;
        riddles_solved: number | null;
        last_solved_date: string | null;
      } | null };

    if (stats) {
      baseState.streak = {
        currentStreak: stats.current_streak ?? 0,
        bestStreak: stats.best_streak ?? 0,
        totalXP: stats.total_xp ?? 0,
        totalSolved: stats.riddles_solved ?? 0,
      };
      const last = stats.last_solved_date;
      baseState.solvedToday = typeof last === 'string' && last.slice(0, 10) === today;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const { data: attempts } = await supabase
      .from('user_attempts')
      .select(`
        attempted_at,
        riddle_id,
        riddles ( difficulty )
      `)
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .gte('attempted_at', thirtyDaysAgo.toISOString())
      .order('attempted_at', { ascending: false });

    if (attempts?.length) {
      const activityMap = new Map<string, DailySolvedEntry>();

      attempts.forEach((attempt: {
        attempted_at: string;
        riddle_id: string;
        riddles: { difficulty: string } | null;
      }) => {
        baseState.solvedRiddleIds.push(attempt.riddle_id);
        const dateStr = toOfficialDateFromInstant(attempt.attempted_at);
        if (!activityMap.has(dateStr)) {
          activityMap.set(dateStr, {
            date: dateStr,
            difficulty: (attempt.riddles?.difficulty as DailySolvedEntry['difficulty']) || 'medium',
            hintsUsed: 0,
          });
        }
      });

      baseState.activityMap = Array.from(activityMap.values());
    }

    return NextResponse.json(baseState);
  } catch (error) {
    console.error('[GET /api/session]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
