'use client';

import { motion } from 'framer-motion';
import ProgressCalendar from '@/components/ProgressCalendar';
import type { UserStats, Achievement } from '@/types/gamification';
import type { DbProfile } from '@/types/supabase';
import type { DailySolvedEntry } from '@/types';
import { Container } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Calendar, Award, Target, Flame } from 'lucide-react';

interface Props {
  profile: DbProfile;
  stats: UserStats | null;
  activity: DailySolvedEntry[];
  achievements: (Achievement & { unlocked_at: string })[];
  xpRank: number | null;
}

export default function ProfileContent({ profile, stats, activity, achievements, xpRank }: Props) {
  const currentStreak = stats?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? 0;
  const totalXP = stats?.total_xp ?? 0;
  const riddlesSolved = stats?.riddles_solved ?? 0;
  const accuracy =
    stats && stats.total_attempts > 0 ? Math.round((stats.correct_attempts / stats.total_attempts) * 100) : 0;

  return (
    <Container wide className="py-14 lg:py-20">
      <main className="mx-auto flex max-w-3xl flex-col gap-10">
        <Card padding="lg" className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-bg-muted">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-text-3">
                {(profile.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-text-1 sm:text-[1.75rem]">
              {profile.full_name || `@${profile.username}`}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
              <span>@{profile.username}</span>
              <span className="text-text-4">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} className="text-text-3" />
                Joined{' '}
                {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {xpRank != null && (
            <div className="sm:text-right">
              <p className="text-[11px] font-medium text-text-3">XP rank</p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-text-1">#{xpRank}</p>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Flame className="text-primary" size={16} />} label="Streak" value={currentStreak} sub={`best ${bestStreak}`} />
          <StatCard icon={<Award className="text-text-3" size={16} />} label="XP" value={totalXP.toLocaleString()} />
          <StatCard icon={<Target className="text-success" size={16} />} label="Solved" value={riddlesSolved} />
          <StatCard icon={<Calendar className="text-text-3" size={16} />} label="Accuracy" value={`${accuracy}%`} />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-text-1">Activity (30 days)</h2>
          <p className="mt-1 text-xs text-text-3">One cell per official day · color encodes hardest difficulty solved that day.</p>
          <Card padding="md" className="mt-4">
            <ProgressCalendar solvedDates={activity} />
          </Card>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-text-1">Achievements</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {achievements.length > 0 ? (
              achievements.map((ach) => (
                <Card key={ach.id} padding="md" className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-muted text-lg">
                    {ach.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-1">{ach.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-3">{ach.description}</p>
                  </div>
                </Card>
              ))
            ) : (
              <Card padding="lg" className="col-span-full text-center text-sm text-text-3">
                No achievements yet.
              </Card>
            )}
          </div>
        </section>
      </main>
    </Container>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card padding="md" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-text-3">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold tabular-nums text-text-1">{value}</span>
        {sub && <span className="text-[10px] text-text-4">{sub}</span>}
      </div>
    </Card>
  );
}
