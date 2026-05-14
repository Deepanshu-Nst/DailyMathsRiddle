'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

type LeaderboardType = 'xp' | 'streak' | 'accuracy' | 'hard';

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  current_streak: number;
  best_streak: number;
  riddles_solved: number;
  hard_solved: number;
  accuracy: number;
}

export default function LeaderboardContent() {
  const router = useRouter();
  const [type, setType] = useState<LeaderboardType>('xp');
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard?type=${type}`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, [type]);

  const tabs: { id: LeaderboardType; label: string }[] = [
    { id: 'xp', label: 'All-Time XP' },
    { id: 'streak', label: 'Streak' },
    { id: 'hard', label: 'Hard Solves' },
    { id: 'accuracy', label: 'Accuracy' },
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <main style={{ width: '100%', maxWidth: 860, padding: 'clamp(48px, 8vh, 96px) 0 80px', display: 'flex', flexDirection: 'column', gap: 48 }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, marginBottom: 12 }}>
            Global Rankings
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-3)' }}>
            The elite minds of the AdvaitAI community.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', justifyContent: 'center', gap: 8, 
          padding: 6, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, width: 'fit-content', margin: '0 auto'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              style={{
                padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: type === tab.id ? 'var(--text-1)' : 'transparent',
                color: type === tab.id ? 'var(--bg)' : 'var(--text-3)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                border: 'none', cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-4)' }}
              >
                Calculating rankings...
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {users.length > 0 ? (
                  users.map((user, idx) => (
                    <RankRow 
                      key={user.user_id} 
                      user={user} 
                      rank={idx + 1} 
                      type={type} 
                      onClick={() => router.push(`/u/${user.username}`)}
                    />
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-4)' }}>
                    No data available yet.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>
    </div>
  );
}

function RankRow({ user, rank, type, onClick }: { user: LeaderboardUser; rank: number; type: LeaderboardType; onClick: () => void }) {
  const getValue = () => {
    switch (type) {
      case 'xp': return `${user.total_xp} XP`;
      case 'streak': return `${user.current_streak} days`;
      case 'hard': return `${user.hard_solved} hard`;
      case 'accuracy': return `${Math.round(user.accuracy * 100)}%`;
    }
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2, background: 'var(--surface-hover)' }}
      style={{
        display: 'flex', alignItems: 'center', gap: 20,
        padding: '16px 24px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 14,
        cursor: 'pointer', transition: 'background 0.2s ease'
      }}
    >
      <span style={{ 
        fontSize: 15, fontWeight: 700, width: 24, 
        color: rank <= 3 ? 'var(--text-1)' : 'var(--text-4)' 
      }}>
        {rank}
      </span>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--border-subtle)', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 18 }}>👤</span>
          )}
        </div>
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
          {user.username}
        </span>
      </div>

      <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>
        {getValue()}
      </span>
    </motion.div>
  );
}
