'use client';
import { useEffect, useState } from 'react';
import { getSecondsUntilMidnightLocal, formatCountdown } from '@/lib/timezone';

/**
 * CountdownTimer — client-only.
 *
 * Uses `mounted` guard to prevent hydration mismatch:
 * The server renders this as null (no countdown text).
 * The client renders the live countdown after mount.
 *
 * Without this guard, SSR and client diverge by 1 second,
 * causing React's hydration error.
 */
export default function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    // Only run on client after first paint
    setSecs(getSecondsUntilMidnightLocal());
    setMounted(true);

    const id = setInterval(() => setSecs(getSecondsUntilMidnightLocal()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="label">Next ritual in</span>
      <span
        className="mono"
        suppressHydrationWarning
        style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.04em' }}
      >
        {mounted ? formatCountdown(secs) : '—'}
      </span>
    </div>
  );
}
