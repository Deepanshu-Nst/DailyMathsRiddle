import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileContent from '@/components/profile/ProfileContent';
import { traceSocialAction } from '@/lib/analytics/pipelineEvents';
import type { DbProfile } from '@/types/supabase';

interface Props {
  params: { username: string };
}

/**
 * Public Profile Page: /u/[username]
 * Fetches all necessary data server-side for SEO and performance.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('username', params.username)
    .single() as { data: Pick<DbProfile, 'username' | 'full_name'> | null };

  if (!profile) return { title: 'User Not Found | AdvaitAI' };

  const name = profile.full_name || profile.username;
  return {
    title: `${name} (@${profile.username}) | AdvaitAI Math Riddle`,
    description: `Check out ${name}'s progress, streak, and solved riddles on AdvaitAI.`,
    openGraph: {
      title: `${name}'s Intelligence Ritual`,
      description: `Solving daily math challenges and building a mind for mastery.`,
      type: 'profile',
      username: profile.username || undefined,
    },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const supabase = await createClient();

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single() as { data: DbProfile | null };

  if (!profile) notFound();

  traceSocialAction('profile_view', { username: params.username, userId: profile.id });

  // 2. Fetch User Stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', profile.id)
    .single();

  // 3. Fetch Solved Dates (for heatmap)
  const { data: events } = await supabase
    .from('streak_events')
    .select('solved_date')
    .eq('user_id', profile.id)
    .order('solved_date', { ascending: false })
    .limit(100) as { data: Array<{ solved_date: string }> | null };

  // 4. Fetch Achievements
  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select(`
      unlocked_at,
      achievements (*)
    `)
    .eq('user_id', profile.id);

  return (
    <ProfileContent
      profile={profile as any}
      stats={stats as any}
      solvedDates={(events || []).map(e => e.solved_date)}
      achievements={(userAchievements || []).map((ua: any) => ({
        ...ua.achievements,
        unlocked_at: ua.unlocked_at,
      }))}
    />
  );
}
