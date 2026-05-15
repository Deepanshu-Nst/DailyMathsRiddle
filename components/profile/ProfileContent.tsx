'use client';

import ProgressCalendar from '@/components/ProgressCalendar';
import type { UserStats, Achievement } from '@/types/gamification';
import type { DbProfile } from '@/types/supabase';
import type { DailySolvedEntry } from '@/types';
import { Container } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Award, Target, Flame } from 'lucide-react';
import Link from 'next/link';

interface SolveHistoryEntry {
  id: string;
  solvedAt: string;
  question: string;
  difficulty: string;
  dailyDate: string | null;
  slug: string | null;
}

interface Props {
  profile: DbProfile;
  stats: UserStats | null;
  activity: DailySolvedEntry[];
  achievements: (Achievement & { unlocked_at: string })[];
  xpRank: number | null;
  solveHistory: SolveHistoryEntry[];
}

export default function ProfileContent({ profile, stats, activity, achievements, xpRank, solveHistory }: Props) {
  const currentStreak = stats?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? 0;
  const totalXP = stats?.total_xp ?? 0;
  const riddlesSolved = stats?.riddles_solved ?? 0;
  const easySolved = stats?.easy_solved ?? 0;
  const mediumSolved = stats?.medium_solved ?? 0;
  const hardSolved = stats?.hard_solved ?? 0;
  const accuracy =
    stats && stats.total_attempts > 0 ? Math.round((stats.correct_attempts / stats.total_attempts) * 100) : 0;

  const totalDiffSolved = easySolved + mediumSolved + hardSolved;

  return (
    <Container wide className="py-14 lg:py-20">
      <main className="mx-auto flex max-w-3xl flex-col gap-10">
        {/* Header */}
        <Card padding="lg" className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-bg-muted">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.username || "Avatar"} className="h-full w-full object-cover" />
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

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Flame className="text-primary" size={16} />} label="Streak" value={currentStreak} sub={`best ${bestStreak}`} />
          <StatCard icon={<Award className="text-text-3" size={16} />} label="XP" value={totalXP.toLocaleString()} />
          <StatCard icon={<Target className="text-success" size={16} />} label="Solved" value={riddlesSolved} />
          <StatCard icon={<Calendar className="text-text-3" size={16} />} label="Accuracy" value={`${accuracy}%`} />
        </div>

        {/* Difficulty Breakdown */}
        {totalDiffSolved > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-1">Difficulty breakdown</h2>
            <p className="mt-1 text-xs text-text-3">{totalDiffSolved} total solves by difficulty level.</p>
            <Card padding="md" className="mt-4">
              <div className="flex flex-col gap-3">
                <DiffBar label="Easy" count={easySolved} total={totalDiffSolved} color="bg-success" />
                <DiffBar label="Medium" count={mediumSolved} total={totalDiffSolved} color="bg-primary" />
                <DiffBar label="Hard" count={hardSolved} total={totalDiffSolved} color="bg-error" />
              </div>
            </Card>
          </section>
        )}

        {/* Activity Calendar */}
        <section>
          <h2 className="text-sm font-semibold text-text-1">Activity (90 days)</h2>
          <p className="mt-1 text-xs text-text-3">One cell per day · color encodes hardest difficulty solved.</p>
          <Card padding="md" className="mt-4">
            <ProgressCalendar solvedDates={activity} />
          </Card>
        </section>

        {/* Recent Solve History */}
        <section>
          <h2 className="text-sm font-semibold text-text-1">Recent solves</h2>
          <div className="mt-4 flex flex-col gap-2">
            {solveHistory.length > 0 ? (
              solveHistory.map((solve) => (
                <Card key={solve.id} padding="sm" className="flex items-center gap-3 px-4 py-3">
                  <Badge
                    variant={solve.difficulty === 'hard' ? 'danger' : solve.difficulty === 'easy' ? 'success' : 'warning'}
                    size="sm"
                    className="font-mono uppercase shrink-0"
                  >
                    {solve.difficulty}
                  </Badge>
                  <p className="min-w-0 flex-1 truncate text-sm text-text-2">
                    {solve.question}
                  </p>
                  <span className="shrink-0 text-[11px] text-text-4 font-mono">
                    {new Date(solve.solvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Card>
              ))
            ) : (
              <Card padding="lg" className="text-center text-sm text-text-3">
                No solves recorded yet.
              </Card>
            )}
          </div>
        </section>

        {/* Achievements */}
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

function DiffBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-xs font-medium text-text-2">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right font-mono text-xs tabular-nums text-text-3">{count}</span>
    </div>
  );
}
