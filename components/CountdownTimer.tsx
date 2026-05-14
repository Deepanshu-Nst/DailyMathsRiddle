'use client';
import { useEffect, useState } from 'react';
import { getSecondsUntilMidnightLocal, formatCountdown } from '@/lib/timezone';
import { Timer } from 'lucide-react';

export default function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    setSecs(getSecondsUntilMidnightLocal());
    setMounted(true);
    const id = setInterval(() => setSecs(getSecondsUntilMidnightLocal()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2.5">
      <Timer size={14} className="text-text-4" />
      <span className="label text-[10px]">Next Riddle</span>
      <span
        className="font-mono text-sm font-bold text-text-1 tracking-wider"
        suppressHydrationWarning
      >
        {mounted ? formatCountdown(secs) : '--:--:--'}
      </span>
    </div>
  );
}
