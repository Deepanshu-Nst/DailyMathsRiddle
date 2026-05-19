'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Trophy, Flame, Calendar, Globe, Medal, Crown } from 'lucide-react';
import { Container } from '@/components/ui/Layout';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Skeleton, SkeletonGroup } from '@/components/ui/Feedback';
import { GlowOrb } from '@/components/ui/GlowOrb';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { staggerContainer, staggerContainerSlow, fadeUp, fadeUpLarge, heroReveal, hoverLift, spring } from '@/lib/motion';

type Tab = 'global' | 'weekly' | 'monthly';

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

  const fetchLeaderboard = useCallback(async () => {
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
  }, [activeTab]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'global', label: 'Global XP', icon: <Globe size={14} /> },
    { id: 'weekly', label: 'Weekly XP', icon: <Calendar size={14} /> },
    { id: 'monthly', label: 'Monthly XP', icon: <Medal size={14} /> },
  ];

  const top3 = entries.slice(0, 3);
  const theRest = entries.slice(3);

  // Visually reorder top 3 to: 2nd, 1st, 3rd for a podium effect
  const podiumTop3 = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <Container wide className="py-12 lg:py-20 relative overflow-hidden">
      <GlowOrb color="rgba(108, 123, 255, 1)" size={700} position="top-center" intensity={0.08} />

      {/* Header */}
      <motion.header variants={staggerContainer} initial="hidden" animate="visible" className="mb-14 relative z-10">
        <motion.div variants={heroReveal} className="text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[0_0_24px_rgba(108,123,255,0.2)]">
              <Trophy size={20} />
            </div>
          </div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-text-4">
            Prestige ladder
          </p>
          <h1 className="font-display mt-3 text-balance text-[clamp(2.5rem,5vw,4rem)] leading-[1.02] text-text-1">
            Global rankings
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-text-2">
            The most disciplined minds on AdvaitAI — ranked by XP, weekly cadence, and monthly surges.
          </p>
        </motion.div>
      </motion.header>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...spring }}
        className="mb-10 flex justify-center"
      >
        <Tabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onChange={(id) => setActiveTab(id as Tab)} 
          variant="contained"
        />
      </motion.div>

      {loading ? (
        <div className="max-w-3xl mx-auto">
          <SkeletonGroup count={6} itemClassName="h-16 w-full" gap="gap-3" />
        </div>
      ) : error ? (
        <Card className="text-center py-12 text-error max-w-xl mx-auto">
          {error}
        </Card>
      ) : (
        <motion.div 
          variants={staggerContainerSlow} 
          initial="hidden" 
          animate="visible" 
          className="flex flex-col gap-12"
        >
          {/* Spotlight Top 3 (Podium) */}
          {podiumTop3.length > 0 && (
            <div className="grid items-end gap-5 md:grid-cols-3 md:gap-6 max-w-3xl mx-auto w-full">
              {podiumTop3.map((entry, i) => {
                const rank = top3.length === 3 ? (i === 0 ? 2 : i === 1 ? 1 : 3) : i + 1;
                return (
                  <motion.div
                    key={entry.id}
                    variants={fadeUpLarge}
                    whileHover={{ y: -6 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                  >
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
          <motion.div variants={fadeUp} className="max-w-3xl mx-auto w-full">
            <Card padding="none" className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">
                      XP
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
  let score = 0;
  if (tab === 'global') score = entry.total_xp || 0;
  else if (tab === 'weekly') score = entry.weekly_xp || 0;
  else if (tab === 'monthly') score = entry.monthly_xp || 0;
  
  const isFirst = rank === 1;
  const isSecond = rank === 2;

  const glowColor = isFirst
    ? 'rgba(108, 123, 255, 0.35)'
    : isSecond
      ? 'rgba(255, 255, 255, 0.08)'
      : 'rgba(108, 123, 255, 0.1)';

  const cardClasses = isFirst
    ? 'z-10 md:scale-[1.06] md:-translate-y-4 border-primary/30 bg-gradient-to-b from-white/[0.08] to-black/40'
    : isSecond
      ? 'md:scale-[0.98] border-white/[0.1] bg-white/[0.04]'
      : 'md:translate-y-2 md:scale-[0.95] border-white/[0.08] bg-white/[0.03]';

  const avatarSize = isFirst ? 'w-20 h-20 sm:w-24 sm:h-24' : isSecond ? 'w-16 h-16' : 'w-14 h-14';
  
  return (
    <div className="h-full transition-transform duration-300">
      <Card 
        className={`relative flex flex-col items-center justify-between h-full pt-8 pb-6 px-6 ${cardClasses}`}
        padding="none"
      >
        {/* Glow effect for #1 */}
        {isFirst && (
          <div className="absolute inset-0 rounded-[inherit] pointer-events-none" style={{
            boxShadow: `0 0 60px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          }} />
        )}

        <div className="flex flex-col items-center text-center gap-4 w-full relative">
          <div className="relative mb-2">
            {/* Crown for #1 */}
            {isFirst && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', damping: 15 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 text-warning"
              >
                <Crown size={24} fill="currentColor" />
              </motion.div>
            )}

            <div className={`${avatarSize} overflow-hidden rounded-full border-2 ${isFirst ? 'border-primary/30' : 'border-white/10'} bg-black/40 shadow-[0_0_24px_rgba(0,0,0,0.4)]`}>
              {entry.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-bg-muted text-text-3 font-bold text-2xl">
                  {entry.username[0].toUpperCase()}
                </div>
              )}
            </div>
            <div
              className={`absolute -bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-[13px] font-bold shadow-lg ${
                isFirst
                  ? 'border-2 border-primary/40 bg-gradient-to-br from-primary to-primary/80 text-white shadow-[0_0_16px_rgba(108,123,255,0.4)]'
                  : isSecond
                    ? 'border border-white/20 bg-gradient-to-br from-zinc-300 to-zinc-500 text-zinc-950'
                    : 'border border-primary/20 bg-gradient-to-br from-primary/30 to-primary/10 text-primary'
              }`}
            >
              {rank}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 items-center">
            {isAnonymous ? (
              <h3 className={`font-semibold ${isFirst ? 'text-[18px] text-text-1' : 'text-[15px] text-text-1'}`}>{entry.username}</h3>
            ) : (
              <Link
                href={`/u/${entry.username}`}
                className={`font-semibold transition-colors hover:text-primary ${isFirst ? 'text-[18px] text-text-1' : 'text-[15px] text-text-1'}`}
              >
                {entry.username}
              </Link>
            )}
            <Badge variant={isFirst ? 'glow' : 'secondary'} size="sm" className={isFirst ? 'font-bold' : ''}>
              <AnimatedNumber value={score} className="tabular-nums" /> XP
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LeaderboardRow({ entry, tab, index }: { entry: LeaderboardEntry; tab: Tab; index: number }) {
  const isAnonymous = entry.username === 'Anonymous Seeker';
  let score = 0;
  if (tab === 'global') score = entry.total_xp || 0;
  else if (tab === 'weekly') score = entry.weekly_xp || 0;
  else if (tab === 'monthly') score = entry.monthly_xp || 0;

  return (
    <TableRow>
      <TableCell className="font-mono text-text-4 font-semibold text-[12px]">
        {String(index + 1).padStart(2, '0')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-bg-muted border border-white/[0.06] overflow-hidden shrink-0 flex items-center justify-center">
            {entry.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.avatar_url} alt={entry.username} className="w-full h-full object-cover" />
            ) : (
              <span className="text-text-3 text-xs font-bold">{entry.username[0].toUpperCase()}</span>
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
        <div className="flex items-center justify-end gap-2.5">
          <span className="font-semibold tabular-nums text-text-1">{score.toLocaleString()}</span>
          <span className="text-[10px] uppercase text-text-4 font-bold tracking-widest w-6 text-left">
            XP
          </span>
        </div>
      </TableCell>
    </TableRow>
  );
}
