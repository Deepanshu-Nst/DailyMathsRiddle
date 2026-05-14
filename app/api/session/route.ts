import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTodayUTC } from '@/lib/timezone';
import { UserSessionState, DailySolvedEntry } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const today = getTodayUTC();

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

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url, current_streak, best_streak, total_xp, solved_count, last_solved_date')
      .eq('id', user.id)
      .single() as { data: any };

    if (profile) {
      baseState.user = {
        id: user.id,
        username: profile.username,
        avatar_url: profile.avatar_url,
      };
      baseState.streak = {
        currentStreak: profile.current_streak ?? 0,
        bestStreak: profile.best_streak ?? 0,
        totalXP: profile.total_xp ?? 0,
        totalSolved: profile.solved_count ?? 0,
      };
      baseState.solvedToday = profile.last_solved_date === today;
    } else {
      baseState.user = { id: user.id, username: null, avatar_url: null };
    }

    // Fetch attempt history for solvedRiddleIds and activityMap
    // We only need attempts that are 'solved'
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const { data: attempts } = await supabase
      .from('attempt_statuses')
      .select(`
        status, 
        created_at, 
        riddle_id,
        riddles ( difficulty )
      `)
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (attempts) {
      const activityMap = new Map<string, DailySolvedEntry>();
      
      attempts.forEach((attempt: any) => {
        baseState.solvedRiddleIds.push(attempt.riddle_id);
        
        // Populate activity map
        const dateStr = attempt.created_at.slice(0, 10);
        if (!activityMap.has(dateStr)) {
          activityMap.set(dateStr, {
            date: dateStr,
            difficulty: attempt.riddles?.difficulty || 'medium',
            hintsUsed: 0 // Cannot easily derive without joining attempts table properly, defaults to 0
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
