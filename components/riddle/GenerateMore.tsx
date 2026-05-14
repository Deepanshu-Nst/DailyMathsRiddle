'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Riddle } from '@/types';

const MAX_PER_DAY = 10;
const COOLDOWN_MS = 5000;
const REQUEST_TIMEOUT_MS = 45_000; // 45s — Groq can be slow under load

function getTodayKey() {
  return `advaitai_usage_${new Date().toISOString().split('T')[0]}`;
}

// ── Typed error states ────────────────────────────────────────────────
type GenerationErrorCode =
  | 'GENERATION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'GENERATION_TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'GENERATION_ERROR'
  | 'NETWORK_ERROR';

const ERROR_MESSAGES: Record<GenerationErrorCode, string> = {
  GENERATION_FAILED: "Couldn't generate a unique riddle. Our AI tried 3× — try again in a moment.",
  QUOTA_EXCEEDED: 'Daily limit reached. Come back tomorrow for more challenges.',
  GENERATION_TIMEOUT: 'Request timed out. Groq may be under load — please try again.',
  INVALID_RESPONSE: 'Invalid request. Please try again.',
  GENERATION_ERROR: 'AI service temporarily unavailable. Please try again in a few minutes.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
};

interface GenerateMoreProps {
  sessionId: string;
  difficulty: string;
  onNewRiddle: (riddle: Partial<Riddle>) => void;
}

/**
 * GenerateMore — deterministic quota + state flow.
 *
 * Error handling contract:
 * - All errors typed via GenerationErrorCode
 * - Request has a hard 45s AbortController timeout
 * - Loading lock (requestInFlight ref) prevents spam
 * - Quota incremented ONLY when server returns generationCount
 * - DEV TRACE badge gated behind process.env.NODE_ENV === 'development'
 */
export default function GenerateMore({ sessionId, difficulty, onNewRiddle }: GenerateMoreProps) {
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [errorCode, setErrorCode] = useState<GenerationErrorCode | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [templateFamily, setTemplateFamily] = useState<string | null>(null);
  
  const requestInFlight = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setUsed(Number(localStorage.getItem(getTodayKey()) || 0));
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  const limitReached = used >= MAX_PER_DAY;
  const blocked = loading || cooldown || limitReached;
  const errorMsg = errorCode ? ERROR_MESSAGES[errorCode] : null;

  const handleGenerate = async () => {
    if (requestInFlight.current || blocked) return;
    requestInFlight.current = true;

    setLoading(true);
    setErrorCode(null);
    setAttempts([]);

    // Create abort controller — cancels request after timeout
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch('/api/riddles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty, sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      // Dev-only trace log — stripped at build time in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[GEN RESPONSE]', {
          status: res.status,
          success: data.success,
          code: data.code,
          generationCount: data.generationCount,
          riddleId: data.riddle?.riddleId,
          slug: data.riddle?.slug,
          templateFamily: data.templateFamily,
        });
      }

      // ── Error handling via stable codes ────────────────────────────
      if (!res.ok || !data.success) {
        if (data.attempts) setAttempts(data.attempts);
        throw new Error(data.code || 'GENERATION_ERROR');
      }

      // ── Quota sync ──────────────────────────────────────────────────
      if (typeof data.generationCount === 'number') {
        setUsed(data.generationCount);
        localStorage.setItem(getTodayKey(), String(data.generationCount));
      }

      // ── Success gate ────────────────────────────────────────────────
      if (data.riddle) {
        setCooldown(true);
        if (data.templateFamily) setTemplateFamily(data.templateFamily);
        cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);
        onNewRiddle(data.riddle);
      } else {
        throw new Error('INVALID_RESPONSE');
      }

    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setErrorCode('GENERATION_TIMEOUT');
        } else if (err.message in ERROR_MESSAGES) {
          setErrorCode(err.message as GenerationErrorCode);
        } else {
          setErrorCode('NETWORK_ERROR');
        }
      } else {
        setErrorCode('NETWORK_ERROR');
      }
    } finally {
      setLoading(false);
      requestInFlight.current = false;
      abortRef.current = null;
    }
  };

  const btnLabel = (() => {
    if (loading)      return <LoadingSpinner label="Generating..." />;
    if (cooldown)     return 'Please wait...';
    if (limitReached) return 'Daily limit reached';
    return 'Generate Another 🔁';
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
      {/* ── Generate button ── */}
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

      {/* ── Typed error state ── */}
      {errorMsg && (
        <div style={{
          marginTop: 10,
          padding: '10px 14px',
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.18)',
          borderRadius: 6,
          fontSize: 13,
          color: 'var(--error, #ef4444)',
          lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>
            {errorCode === 'GENERATION_TIMEOUT' ? '⏱ Timed out'
              : errorCode === 'GENERATION_ERROR' ? '⚠ AI Unavailable'
              : errorCode === 'QUOTA_EXCEEDED' ? '🔒 Limit reached'
              : '✗ Generation failed'}
          </span>
          {errorMsg}
        </div>
      )}

      {/* ── DEV TRACE badge — never shown in production ── */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          fontSize: 11,
          color: 'var(--text-4)',
          fontFamily: 'monospace',
          lineHeight: 1.7,
        }}>
          <div><strong style={{ color: 'var(--text-3)' }}>DEV TRACE</strong></div>
          <div>Route: /api/riddles/generate</div>
          <div>Mode: {loading ? 'loading...' : 'idle'}</div>
          <div>Used today: {used} / {MAX_PER_DAY}</div>
          {templateFamily && <div>Template Family: <strong style={{ color: 'var(--text-3)' }}>{templateFamily}</strong></div>}
          {errorCode && <div>Error code: <strong style={{ color: '#f87171' }}>{errorCode}</strong></div>}
          
          {attempts.length > 0 && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div><strong>Generation Attempts ({attempts.length}):</strong></div>
              {attempts.map((att, idx) => (
                <div key={idx} style={{ marginTop: 4, paddingLeft: 6, borderLeft: '2px solid rgba(239,68,68,0.4)' }}>
                  <div>Attempt: {att.attempt}</div>
                  <div>Failed at: <span style={{ color: '#fbbf24' }}>{att.failedAt}</span></div>
                  {att.templateFamily && <div>Template: <span style={{ color: '#60a5fa' }}>{att.templateFamily}</span></div>}
                  {att.durationMs && <div>Duration: {att.durationMs}ms</div>}
                  <div style={{ color: 'var(--text-4)' }}>{att.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Quota counter ── */}
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
      <svg style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} viewBox="0 0 24 24">
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
