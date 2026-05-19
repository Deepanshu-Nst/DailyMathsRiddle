'use client';

import { useEffect, useState } from 'react';
import { formatCountdown, getOfficialTimezoneShort, getSecondsUntilOfficialMidnight } from '@/lib/timezone';

export default function CountdownTimer({ minimal }: { minimal?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [secs, setSecs] = useState(0);
  const tz = getOfficialTimezoneShort();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSecs(getSecondsUntilOfficialMidnight());
     
    setMounted(true);
    const id = setInterval(() => setSecs(getSecondsUntilOfficialMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = mounted ? formatCountdown(secs) : '--:--:--';
  const parts = timeStr.split(':');
  const isUrgent = mounted && secs < 3600; // Last hour

  if (minimal) {
    return (
      <span
        className={`font-display text-2xl tabular-nums tracking-wide ${isUrgent ? 'text-warning' : 'text-text-1'}`}
        suppressHydrationWarning
      >
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="anim-colon-blink mx-0.5 text-text-3">:</span>
            )}
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="label text-[10px] text-text-4">Next reset · {tz}</span>
      <span
        className={`font-display text-2xl tabular-nums tracking-wide ${isUrgent ? 'text-warning' : 'text-text-1'}`}
        suppressHydrationWarning
      >
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="anim-colon-blink mx-0.5 text-text-3">:</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}
