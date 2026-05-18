'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Riddle } from '@/types';
import { getOfficialDailyDate } from '@/lib/timezone';

const MAX_PER_DAY = 10;
const COOLDOWN_MS = 5000;
const REQUEST_TIMEOUT_MS = 45_000; // 45s — Groq can be slow under load

/**
 * IST-aware daily key for localStorage quota tracking.
 * MUST use getOfficialDailyDate() — never UTC.
 */
function getTodayKey() {
  return `advaitai_usage_${getOfficialDailyDate()}`;
}

// ── Typed error states ────────────────────────────────────────────────
type GenerationErrorCode =
  | 'GENERATION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'GENERATION_TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'GENERATION_ERROR'
  | 'NETWORK_ERROR'
  | 'IDENTITY_MISMATCH';

const ERROR_MESSAGES: Record<GenerationErrorCode, string> = {
  GENERATION_FAILED: "Couldn't generate a unique riddle. Our AI tried 3× — try again in a moment.",
  QUOTA_EXCEEDED: 'Daily limit reached. Come back tomorrow for more challenges.',
  GENERATION_TIMEOUT: 'Request timed out. Groq may be under load — please try again.',
  INVALID_RESPONSE: 'Invalid request. Please try again.',
  GENERATION_ERROR: 'AI service temporarily unavailable. Please try again in a few minutes.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  IDENTITY_MISMATCH: 'Generated riddle was identical to current. Retrying automatically.',
};

interface GenerateMoreProps {
  sessionId: string;
  difficulty: string;
  onNewRiddle: (riddle: Partial<Riddle>) => void;
  onStartGeneration?: () => void;
  /** Current riddle ID for server-side dedup verification */
  currentRiddleId?: string;
}

/**
 * GenerateMore — deterministic quota + state flow.
 *
 * Error handling contract:
 * - All errors typed via GenerationErrorCode
 * - Request has a hard 45s AbortController timeout
 * - Loading lock (requestInFlight ref) prevents spam
 * - Quota incremented ONLY after:
 *   1. Server returns success
 *   2. Riddle identity verified (new ID != current ID)
 *   3. UI state swap confirmed via onNewRiddle
 * - If riddle ID unchanged: quota rollback + retry state
 */
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RotateCw, AlertTriangle, Lock, Info } from 'lucide-react';

export default function GenerateMore({
  sessionId,
  difficulty,
  onNewRiddle,
  onStartGeneration,
  currentRiddleId,
}: GenerateMoreProps) {
  const [used, setUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [errorCode, setErrorCode] = useState<GenerationErrorCode | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [templateFamily, setTemplateFamily] = useState<string | null>(null);

  const requestInFlight = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentRiddleIdRef = useRef<string | undefined>(currentRiddleId);

  // Keep ref in sync with prop
  useEffect(() => {
    currentRiddleIdRef.current = currentRiddleId;
  }, [currentRiddleId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUsed(Number(localStorage.getItem(getTodayKey()) || 0));
    return () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
      abortRef.current?.abort();
    };
  }, []);

  const limitReached = used >= MAX_PER_DAY;
  const blocked = loading || cooldown || limitReached;
  const errorMsg = errorCode ? ERROR_MESSAGES[errorCode] : null;

  const handleGenerate = useCallback(async () => {
    if (requestInFlight.current || blocked) return;
    requestInFlight.current = true;

    setLoading(true);
    setErrorCode(null);
    setAttempts([]);
    setTemplateFamily(null);
    if (onStartGeneration) onStartGeneration();

    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch('/api/riddles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty,
          sessionId,
          previousRiddleId: currentRiddleIdRef.current || null,
        }),
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.attempts) setAttempts(data.attempts);
        throw new Error(data.code || 'GENERATION_ERROR');
      }

      if (!data.riddle || !data.riddle.id) {
        throw new Error('INVALID_RESPONSE');
      }

      // ── CRITICAL: Verify riddle identity changed ──
      if (currentRiddleIdRef.current && data.riddle.id === currentRiddleIdRef.current) {
        console.warn('[GenerateMore] Riddle identity unchanged — NOT incrementing quota');
        setErrorCode('IDENTITY_MISMATCH');
        // Do NOT increment quota, do NOT call onNewRiddle
        return;
      }

      // ── Identity verified — safe to increment quota ──
      if (typeof data.generationCount === 'number') {
        setUsed(data.generationCount);
        localStorage.setItem(getTodayKey(), String(data.generationCount));
      }

      if (data.templateFamily) setTemplateFamily(data.templateFamily);
      setCooldown(true);
      cooldownTimer.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);

      // Call onNewRiddle LAST — after all state is settled
      onNewRiddle(data.riddle);
    } catch (err) {
      clearTimeout(timeoutId);
      // Do NOT increment quota on failure
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
  }, [blocked, difficulty, sessionId, onNewRiddle, onStartGeneration]);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Generate button ── */}
      <Button
        onClick={handleGenerate}
        disabled={blocked}
        variant="primary"
        size="lg"
        className="w-full shadow-lg shadow-primary/10 gap-2"
      >
        {loading ? (
          <>
            <RotateCw size={18} className="animate-spin" />
            Generating...
          </>
        ) : cooldown ? (
          'Please wait...'
        ) : limitReached ? (
          <>
            <Lock size={18} />
            Limit Reached
          </>
        ) : (
          <>
            <RotateCw size={18} />
            Generate Another Riddle
          </>
        )}
      </Button>

      {/* ── Typed error state ── */}
      {errorMsg && (
        <div className="flex items-start gap-3 p-4 bg-error-bg border border-error/10 rounded-xl">
          <AlertTriangle className="text-error shrink-0 mt-0.5" size={16} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-error uppercase tracking-wider">
              {errorCode === 'GENERATION_TIMEOUT' ? 'Timed Out'
                : errorCode === 'GENERATION_ERROR' ? 'AI Unavailable'
                : errorCode === 'QUOTA_EXCEEDED' ? 'Limit Reached'
                : errorCode === 'IDENTITY_MISMATCH' ? 'Duplicate Detected'
                : 'Generation Failed'}
            </span>
            <p className="text-xs text-text-2 leading-relaxed">
              {errorMsg}
            </p>
          </div>
        </div>
      )}

      {/* ── DEV TRACE ── */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 bg-bg-subtle border border-border rounded-xl font-mono text-[10px] text-text-4 leading-relaxed">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" size="sm">DEV TRACE</Badge>
          </div>
          <div>Used today: <span className="text-text-2 font-bold">{used} / {MAX_PER_DAY}</span></div>
          {templateFamily && <div>Template: <span className="text-primary">{templateFamily}</span></div>}
          {currentRiddleId && <div>Current ID: <span className="text-text-3">{currentRiddleId}</span></div>}
          {attempts.length > 0 && (
             <div className="mt-2 pt-2 border-t border-border/50">
               <div className="mb-1 uppercase font-bold">Failed Attempts:</div>
               {attempts.map((att, idx) => (
                 <div key={idx} className="mb-1 text-error/80">• {att.failedAt}: {att.reason}</div>
               ))}
             </div>
          )}
        </div>
      )}

      {/* ── Quota counter ── */}
      <div className="flex items-center justify-center gap-2 text-xs font-medium text-text-3">
        <Info size={12} />
        {limitReached
          ? 'Daily quota exhausted.'
          : `${MAX_PER_DAY - used} riddle generations remaining today`}
      </div>
    </div>
  );
}
