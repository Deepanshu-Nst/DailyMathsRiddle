'use client';

import { motion } from 'framer-motion';
import ProgressCalendar from '@/components/ProgressCalendar';
import type { UserStats, Achievement } from '@/types/gamification';
import type { DbProfile } from '@/types/supabase';

interface Props {
  profile: DbProfile;
  stats: UserStats | null;
  solvedDates: string[];
  achievements: (Achievement & { unlocked_at: string })[];
}

import { Container, Section } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Award, Target, Flame } from 'lucide-react';

export default function ProfileContent({ profile, stats, solvedDates, achievements }: Props) {
  const currentStreak = stats?.current_streak ?? 0;
  const bestStreak = stats?.best_streak ?? 0;
  const totalXP = stats?.total_xp ?? 0;
  const riddlesSolved = stats?.riddles_solved ?? 0;
  const accuracy = stats && stats.total_attempts > 0 
    ? Math.round((stats.correct_attempts / stats.total_attempts) * 100) 
    : 0;

  return (
    <Container className="py-16">
      <main className="max-w-4xl mx-auto flex flex-col gap-12">
        
        {/* ── Header Card ────────────────────────── */}
        <Card padding="lg" className="flex items-center gap-8 flex-wrap md:flex-nowrap">
          <div className="w-24 h-24 rounded-full border-4 border-bg-subtle overflow-hidden bg-bg-subtle shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-4">
                <span className="text-4xl font-bold">{(profile.username?.[0] || 'U').toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-black text-text-1 tracking-tight">
              {profile.full_name || `@${profile.username}`}
            </h1>
            <div className="flex items-center gap-4 text-sm text-text-3 font-medium">
              <span className="text-text-2">@{profile.username}</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
          
          <div className="md:ml-auto flex gap-3">
             <Badge variant="primary" size="md">Rank #42</Badge>
          </div>
        </Card>

        {/* ── Core Stats ────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Flame className="text-primary" size={18} />} label="Streak" value={currentStreak} sub={`${bestStreak} best`} />
          <StatCard icon={<Award className="text-orange-400" size={18} />} label="Total XP" value={totalXP.toLocaleString()} />
          <StatCard icon={<Target className="text-success" size={18} />} label="Solved" value={riddlesSolved} />
          <StatCard icon={<Calendar className="text-info" size={18} />} label="Accuracy" value={`${accuracy}%`} />
        </div>

        {/* ── Activity & Heatmap ────────────────── */}
        <Section title="Learning Activity" subtitle="Your ritual progress over the last 30 days.">
          <Card padding="lg">
            <ProgressCalendar solvedDates={solvedDates.map(date => ({ date, difficulty: 'medium' as any, hintsUsed: 0 }))} />
          </Card>
        </Section>

        {/* ── Achievements ──────────────────────── */}
        <Section title="Achievements" subtitle="Milestones unlocked through mathematical mastery.">
          <div className="grid sm:grid-cols-2 gap-4">
            {achievements.length > 0 ? (
              achievements.map((ach) => (
                <Card key={ach.id} padding="md" className="flex items-center gap-4 hover:border-primary/20 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-bg-subtle flex items-center justify-center text-2xl">
                    {ach.icon}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-text-1">{ach.name}</span>
                    <span className="text-xs text-text-3 leading-relaxed">{ach.description}</span>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-xl text-text-4 text-sm font-medium bg-bg-subtle/30">
                No achievements unlocked yet. Solve daily riddles to earn badges.
              </div>
            )}
          </div>
        </Section>

      </main>

      <footer className="mt-24 pt-8 border-t border-border text-center text-xs text-text-4 font-medium">
        AdvaitAI · Intelligent Reasoning Engine · © 2026
      </footer>
    </Container>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-text-1">{value}</span>
        {sub && <span className="text-[10px] font-bold text-text-4 uppercase">{sub}</span>}
      </div>
    </Card>
  );
}

