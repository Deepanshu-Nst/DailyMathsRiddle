import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getOfficialDailyDate, toOfficialDateFromInstant, getISTDayBoundaryRange, addOfficialCalendarDays } from '@/lib/timezone';
import { computeStreakFromDates } from '@/lib/gamification/computeStreak';
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

    // Fetch user_stats for XP and total counts
    const { data: stats } = await supabase
      .from('user_stats')
      .select('total_xp, riddles_solved, current_streak, best_streak')
      .eq('user_id', user.id)
      .maybeSingle() as { data: {
        total_xp: number | null;
        riddles_solved: number | null;
        current_streak: number | null;
        best_streak: number | null;
      } | null };

    // ── Fetch solved attempts with IST-correct boundary ──
    // Go back 90 days from today IST for the activity calendar
    const windowStart = addOfficialCalendarDays(today, -90);
    // Convert IST midnight to UTC for the DB query
    const { start: windowStartUTC } = getISTDayBoundaryRange(new Date(windowStart + 'T00:00:00+05:30'));

    const { data: attempts } = await supabase
      .from('user_attempts')
      .select(`
        attempted_at,
        riddle_id,
        riddles ( difficulty )
      `)
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .gte('attempted_at', windowStartUTC)
      .order('attempted_at', { ascending: false });

    // ── Build activity map from attempts ──
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

    // ── Recompute streak dynamically from actual solved IST dates ──
    // Fetch ALL solved attempts for accurate streak computation (not just 90 days)
    const { data: allSolvedAttempts } = await supabase
      .from('user_attempts')
      .select('attempted_at')
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .order('attempted_at', { ascending: false })
      .limit(365);

    const allTimestamps = (allSolvedAttempts ?? []).map(
      (a: { attempted_at: string }) => a.attempted_at
    );
    const computed = computeStreakFromDates(allTimestamps, today);

    baseState.streak = {
      currentStreak: computed.currentStreak,
      bestStreak: Math.max(computed.bestStreak, stats?.best_streak ?? 0),
      totalXP: stats?.total_xp ?? 0,
      totalSolved: stats?.riddles_solved ?? 0,
    };
    baseState.solvedToday = computed.todaySolved;

    return NextResponse.json(baseState);
  } catch (error) {
    console.error('[GET /api/session]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
