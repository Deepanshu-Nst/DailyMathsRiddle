'use client';
import React, { useState, useEffect } from 'react';
import { Riddle } from '@/types';

const MAX_PER_DAY = 10;

function getTodayKey() {
  return `advaitai_usage_${new Date().toISOString().split('T')[0]}`;
}

function getUsage(): number {
  return Number(localStorage.getItem(getTodayKey()) || 0);
}

function incrementUsage() {
  const key = getTodayKey();
  localStorage.setItem(key, String(getUsage() + 1));
}

interface GenerateMoreProps {
  sessionId: string;
  difficulty: string;
  onNewRiddle: (riddle?: Partial<Riddle>) => void;
}

export default function GenerateMore({ difficulty, onNewRiddle }: GenerateMoreProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(0);

  // Read usage from localStorage on mount (client-only)
  useEffect(() => {
    setUsed(getUsage());
  }, []);

  const remaining = MAX_PER_DAY - used;
  const limitReached = remaining <= 0;

  const handleGenerate = async () => {
    if (loading || limitReached) return;

    // Enforce limit client-side before hitting the API
    if (getUsage() >= MAX_PER_DAY) {
      setUsed(MAX_PER_DAY);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/riddle/generate-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to generate riddle.');
        // Do NOT increment on failure
      } else {
        // Only increment on success
        incrementUsage();
        setUsed(getUsage());
        onNewRiddle(data.riddle);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
      <button
        onClick={handleGenerate}
        disabled={loading || limitReached}
        className="btn btn-ghost"
        style={{ flex: 1, justifyContent: 'center', opacity: limitReached ? 0.45 : 1 }}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75" />
            </svg>
            Generating...
          </span>
        ) : limitReached ? (
          "Daily limit reached"
        ) : (
          'Generate Another 🔁'
        )}
      </button>

      {error && (
        <p style={{ marginTop: 12, color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>{error}</p>
      )}

      <p style={{ marginTop: 12, color: 'var(--text-4)', fontSize: 13, textAlign: 'center' }}>
        {limitReached
          ? 'Come back tomorrow for more challenges.'
          : `${used} / ${MAX_PER_DAY} used today`}
      </p>
    </div>
  );
}
