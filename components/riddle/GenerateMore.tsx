import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { Riddle } from '@/types';

interface GenerateMoreProps {
  sessionId: string;
  difficulty: string;
  onNewRiddle: (riddle?: Partial<Riddle>) => void;
}

export default function GenerateMore({ sessionId, difficulty, onNewRiddle }: GenerateMoreProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/riddle/generate-extra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, difficulty })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to generate riddle.');
      } else {
        setRemaining(data.usage.remaining);
        onNewRiddle(data.riddle);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const limitReached = remaining !== null && remaining <= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
      
      <button
        onClick={handleGenerate}
        disabled={loading || limitReached}
        className="btn btn-ghost"
        style={{ flex: 1, justifyContent: 'center' }}
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
          'Daily Limit Reached'
        ) : (
          'Generate Another 🔁'
        )}
      </button>

      {error && (
        <p style={{ marginTop: 12, color: 'var(--error)', fontSize: 13, textAlign: 'center' }}>{error}</p>
      )}

      {!limitReached && (
        <p style={{ marginTop: 12, color: 'var(--text-4)', fontSize: 13, textAlign: 'center' }}>
          {remaining !== null ? `${remaining}/10 remaining today` : '10 extra allowed per day'}
        </p>
      )}
    </div>
  );
}
