'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Flame, Calendar, Globe, Medal, ChevronRight } from 'lucide-react';
import { Container, Section } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Feedback';
import { staggerContainer, fadeUp, hoverLift } from '@/lib/motion';

type Tab = 'global' | 'weekly' | 'monthly' | 'streaks';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  total_xp?: number;
  weekly_xp?: number;
  monthly_xp?: number;
  current_streak?: number;
  rank: number;
}

export default function LeaderboardsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboards/${activeTab}?limit=50`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEntries(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'global', label: 'Global XP', icon: <Globe size={14} /> },
    { id: 'weekly', label: 'Weekly XP', icon: <Calendar size={14} /> },
    { id: 'monthly', label: 'Monthly XP', icon: <Medal size={14} /> },
    { id: 'streaks', label: 'Streaks', icon: <Flame size={14} /> },
  ];

  const top3 = entries.slice(0, 3);
  const theRest = entries.slice(3);

  // Visually reorder top 3 to: 2nd, 1st, 3rd for a podium effect
  const podiumTop3 = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <Container className="py-12">
      <motion.header variants={staggerContainer} initial="hidden" animate="visible" className="mb-10">
        <motion.h1 variants={fadeUp} className="text-[28px] font-display text-text-1 tracking-tight mb-2">Global Rankings</motion.h1>
        <motion.p variants={fadeUp} className="text-text-3 text-[14px] max-w-xl leading-relaxed">
          Track the most dedicated problem solvers in the AdvaitAI community. 
          Solve riddles daily to climb the ranks and earn your place in the Hall of Fame.
        </motion.p>
      </motion.header>

      <div className="flex items-center justify-between mb-8 border-b border-border">
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onChange={(id) => setActiveTab(id as Tab)} 
          variant="underline"
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card className="text-center py-12 text-error bg-error-bg border-error/20">
          {error}
        </Card>
      ) : (
        <motion.div 
          variants={staggerContainer} 
          initial="hidden" 
          animate="visible" 
          className="flex flex-col gap-10"
        >
          {/* Spotlight Top 3 (Podium) */}
          {podiumTop3.length > 0 && (
            <div className="grid md:grid-cols-3 gap-6 items-end">
              {podiumTop3.map((entry, i) => {
                // Because we reordered: index 0 -> rank 2, index 1 -> rank 1, index 2 -> rank 3
                const rank = top3.length === 3 ? (i === 0 ? 2 : i === 1 ? 1 : 3) : (i + 1);
                return (
                  <motion.div key={entry.id} variants={fadeUp}>
                    <SpotlightCard 
                      entry={entry} 
                      rank={rank} 
                      tab={activeTab} 
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* List View */}
          <motion.div variants={fadeUp}>
            <Card padding="none" className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">
                      {activeTab === 'streaks' ? 'Streak' : 'XP'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {theRest.length > 0 ? (
                    theRest.map((entry, i) => (
                      <LeaderboardRow 
                        key={entry.id} 
                        entry={entry} 
                        tab={activeTab} 
                        index={i + 3} 
                      />
                    ))
                  ) : (
                    entries.length <= 3 && (
                      <TableRow hover={false}>
                        <TableCell colSpan={3} className="text-center py-12 text-text-3">
                          No other rankings available for this tier yet.
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </Container>
  );
}

function SpotlightCard({ entry, rank, tab }: { entry: LeaderboardEntry; rank: number; tab: Tab }) {
  const isAnonymous = entry.username === 'Anonymous Seeker';
  const score = entry.total_xp || entry.weekly_xp || entry.monthly_xp || entry.current_streak || 0;
  
  const isFirst = rank === 1;
  const isSecond = rank === 2;

  const cardClasses = isFirst 
    ? 'border-[#d4a017]/30 bg-white shadow-[0_0_40px_rgba(212,160,23,0.08)] z-10 scale-[1.08] -translate-y-4' 
    : isSecond
      ? 'border-border-subtle bg-bg-subtle shadow-sm scale-[0.98]'
      : 'border-border-subtle bg-bg-subtle shadow-sm scale-[0.95] translate-y-2';

  const avatarSize = isFirst ? 'w-24 h-24' : isSecond ? 'w-16 h-16' : 'w-14 h-14';
  
  return (
    <div className="h-full transition-transform duration-300">
      <Card 
        className={`relative flex flex-col items-center justify-between h-full pt-8 pb-6 px-6 ${cardClasses}`}
        padding="none"
      >
        <div className="flex flex-col items-center text-center gap-4 w-full">
          <div className="relative mb-2">
            <div className={`${avatarSize} rounded-full border-4 border-white shadow-sm overflow-hidden bg-white`}>
              {entry.avatar_url ? (
                <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg-muted text-text-3 font-bold text-2xl">
                  {entry.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full shadow-sm flex items-center justify-center font-bold text-[13px] text-white ${
              isFirst ? 'bg-gold border-2 border-white' : 
              isSecond ? 'bg-silver border-2 border-white text-gray-800' : 
              'bg-bronze border-2 border-white'
            }`}>
              {rank}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            {isAnonymous ? (
              <h3 className={`font-semibold ${isFirst ? 'text-[18px] text-gray-900' : 'text-[15px] text-text-1'}`}>{entry.username}</h3>
            ) : (
              <Link href={`/u/${entry.username}`} className={`font-semibold hover:text-primary transition-colors ${isFirst ? 'text-[18px] text-gray-900' : 'text-[15px] text-text-1'}`}>
                {entry.username}
              </Link>
            )}
            <Badge variant={isFirst ? 'warning' : 'secondary'} size="sm" className={isFirst ? 'font-bold' : ''}>
              {score.toLocaleString()} {tab === 'streaks' ? 'Days' : 'XP'}
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LeaderboardRow({ entry, tab, index }: { entry: LeaderboardEntry; tab: Tab; index: number }) {
  const isAnonymous = entry.username === 'Anonymous Seeker';
  const score = entry.total_xp || entry.weekly_xp || entry.monthly_xp || entry.current_streak || 0;

  // Max score for bar width calculation. Realistically this should be passed from parent, but simplified here.
  // Using a visual trick where width is just a relative mapping
  const widthPct = Math.min(100, Math.max(5, (score / 1000) * 100)); // Just a placeholder visual effect

  return (
    <TableRow>
      <TableCell className="font-mono text-text-4 font-semibold text-[12px]">
        {String(index + 1).padStart(2, '0')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bg-muted border border-border-subtle overflow-hidden shrink-0">
            {entry.avatar_url && (
              <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
            )}
          </div>
          {isAnonymous ? (
            <span className="font-medium text-text-1">{entry.username}</span>
          ) : (
            <Link href={`/u/${entry.username}`} className="font-medium text-text-1 hover:text-primary transition-colors">
              {entry.username}
            </Link>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-3">
          <span className="font-semibold text-text-1">{score.toLocaleString()}</span>
          <span className="text-[10px] uppercase text-text-4 font-bold tracking-widest w-6 text-left">
            {tab === 'streaks' ? 'DAY' : 'XP'}
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
