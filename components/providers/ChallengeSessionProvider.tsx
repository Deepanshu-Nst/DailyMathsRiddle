'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserSessionState } from '@/types';

interface ChallengeSessionContextType {
  session: UserSessionState | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const defaultState: UserSessionState = {
  user: null,
  streak: { currentStreak: 0, bestStreak: 0, totalXP: 0, totalSolved: 0 },
  solvedToday: false,
  solvedRiddleIds: [],
  activityMap: [],
};

const ChallengeSessionContext = createContext<ChallengeSessionContextType>({
  session: null,
  loading: true,
  refreshSession: async () => {},
});

export const ChallengeSessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<UserSessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch('/api/session');
      if (res.ok) {
        const data = await res.json();
        setSession(data);
      } else {
        setSession(defaultState);
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
      setSession(defaultState);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return (
    <ChallengeSessionContext.Provider value={{ session, loading, refreshSession: fetchSession }}>
      {children}
    </ChallengeSessionContext.Provider>
  );
};

export const useChallengeSession = () => useContext(ChallengeSessionContext);
