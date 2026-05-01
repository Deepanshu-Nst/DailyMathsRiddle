'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Riddle } from '@/types';

const MAX_PER_DAY = 10;
const COOLDOWN_MS = 5000;

function getTodayKey() {
  return `advaitai_usage_${new Date().toISOString().split('T')[0]}`;
}

interface GenerateMoreProps {
  sessionId: string;
  difficulty: string;
  onNewRiddle: (riddle?: Partial<Riddle>) => void;
}

export default function GenerateMore({ difficulty, onNewRiddle }: GenerateMoreProps) {
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hard ref lock — immune to React batching / stale closures
  const requestInFlight = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read localStorage once on mount (client-only)
  useEffect(() => {
    setUsed(Number(localStorage.getItem(getTodayKey()) || 0));
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, []);

  const limitReached = used >= MAX_PER_DAY;
  const blocked = loading || cooldown || limitReached;

  const handleGenerate = async () => {
    // Hard guard — ref is synchronous, never stale
    if (requestInFlight.current || blocked) return;
    requestInFlight.current = true;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/riddle/generate-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });

      const data = await res.json();

      if (!res.ok || !data?.riddle) {
        // Do NOT increment — generation failed
        setError(data?.error || "Couldn't generate right now. Try again later.");
        return;
      }

      // ✅ Functional update — never reads stale `used`
      setUsed(prev => {
        const next = prev + 1;
        localStorage.setItem(getTodayKey(), String(next));
        return next;
      });

      // ✅ Soft cooldown — prevents rapid re-clicks
      setCooldown(true);
      cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);

      // ✅ Fire callback AFTER state is settled
      onNewRiddle(data.riddle);

    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  };

  const btnLabel = (() => {
    if (loading)     return <LoadingSpinner label="Generating..." />;
    if (cooldown)    return 'Please wait...';
    if (limitReached) return 'Daily limit reached';
    return 'Generate Another 🔁';
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
      <button
        id="generate-more-btn"
        onClick={handleGenerate}
        disabled={blocked}
        className="btn btn-ghost"
        style={{
          flex: 1,
          justifyContent: 'center',
          opacity: blocked ? 0.45 : 1,
          cursor: blocked ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
        }}
      >
        {btnLabel}
      </button>

      {error && (
        <p style={{ marginTop: 12, color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>
          {error}
        </p>
      )}

      <p style={{ marginTop: 12, color: 'var(--text-4)', fontSize: 13, textAlign: 'center' }}>
        {limitReached
          ? 'Come back tomorrow for more challenges.'
          : `${used} / ${MAX_PER_DAY} used today`}
      </p>
    </div>
  );
}

function LoadingSpinner({ label }: { label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <svg
        style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }}
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          opacity="0.75"
        />
      </svg>
      {label}
    </span>
  );
}
