import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileContent from '@/components/profile/ProfileContent';
import type { DbProfile } from '@/types/supabase';
import { toOfficialDateFromInstant } from '@/lib/timezone';
import type { DailySolvedEntry } from '@/types';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: profile } = (await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('username', username)
    .single()) as { data: Pick<DbProfile, 'username' | 'full_name'> | null };

  if (!profile) return { title: 'User Not Found | AdvaitAI' };

  const name = profile.full_name || profile.username;
  return {
    title: `${name} (@${profile.username}) | AdvaitAI`,
    description: `${name}'s public AdvaitAI stats — streak, XP, and recent activity.`,
    openGraph: {
      title: `${name} (@${profile.username})`,
      description: 'Public profile · AdvaitAI',
      type: 'profile',
    },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = (await supabase.from('profiles').select('*').eq('username', username).single()) as {
    data: DbProfile | null;
  };

  if (!profile) notFound();

  const { data: stats } = await supabase.from('user_stats').select('*').eq('user_id', profile.id).single();

  const myXp = (stats as { total_xp?: number } | null)?.total_xp ?? 0;
  const { count: higherXp } = await supabase
    .from('user_stats')
    .select('*', { head: true, count: 'exact' })
    .gt('total_xp', myXp);
  const xpRank = (higherXp ?? 0) + 1;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const { data: attempts } = await supabase
    .from('user_attempts')
    .select(
      `
      attempted_at,
      riddles ( difficulty )
    `,
    )
    .eq('user_id', profile.id)
    .eq('status', 'solved')
    .gte('attempted_at', thirtyDaysAgo.toISOString())
    .order('attempted_at', { ascending: false });

  const activityMap = new Map<string, DailySolvedEntry>();
  if (attempts?.length) {
    attempts.forEach((attempt: { attempted_at: string; riddles: { difficulty: string } | null }) => {
      const dateStr = toOfficialDateFromInstant(attempt.attempted_at);
      if (!activityMap.has(dateStr)) {
        activityMap.set(dateStr, {
          date: dateStr,
          difficulty: (attempt.riddles?.difficulty as DailySolvedEntry['difficulty']) || 'medium',
          hintsUsed: 0,
        });
      }
    });
  }

  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select(
      `
      unlocked_at,
      achievements (*)
    `,
    )
    .eq('user_id', profile.id);

  // Recent solve history (last 20 solves with riddle details)
  const { data: recentSolves } = await supabase
    .from('user_attempts')
    .select(
      `
      id,
      attempted_at,
      riddles ( id, question, difficulty, daily_date, slug )
    `,
    )
    .eq('user_id', profile.id)
    .eq('status', 'solved')
    .order('attempted_at', { ascending: false })
    .limit(20);

  const solveHistory = (recentSolves ?? []).map((s: any) => ({
    id: s.id,
    solvedAt: s.attempted_at,
    question: s.riddles?.question ?? '',
    difficulty: s.riddles?.difficulty ?? 'medium',
    dailyDate: s.riddles?.daily_date,
    slug: s.riddles?.slug,
  }));

  return (
    <ProfileContent
      profile={profile as DbProfile}
      stats={stats as any}
      activity={Array.from(activityMap.values())}
      achievements={(userAchievements || []).map((ua: any) => ({
        ...ua.achievements,
        unlocked_at: ua.unlocked_at,
      }))}
      xpRank={stats ? xpRank : null}
      solveHistory={solveHistory}
    />
  );
}
