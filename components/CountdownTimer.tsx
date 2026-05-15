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

  if (minimal) {
    return (
      <span
        className="font-mono text-sm font-semibold tracking-[0.08em] text-text-1"
        suppressHydrationWarning
      >
        {mounted ? formatCountdown(secs) : '--:--:--'}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="label text-[10px] text-text-4">Next reset · {tz}</span>
      <span
        className="font-mono text-sm font-semibold tracking-[0.08em] text-text-1"
        suppressHydrationWarning
      >
        {mounted ? formatCountdown(secs) : '--:--:--'}
      </span>
    </div>
  );
}
