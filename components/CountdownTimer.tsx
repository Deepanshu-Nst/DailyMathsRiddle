'use client';
import { useEffect, useState } from 'react';
import { getSecondsUntilMidnightLocal, formatCountdown } from '@/lib/timezone';

export default function CountdownTimer() {
  const [secs, setSecs] = useState(getSecondsUntilMidnightLocal());
  useEffect(() => {
    const id = setInterval(() => setSecs(getSecondsUntilMidnightLocal()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span className="label">Next ritual in</span>
      <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '0.04em' }}>
        {formatCountdown(secs)}
      </span>
    </div>
  );
}
