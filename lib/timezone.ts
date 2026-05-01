export function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getSecondsUntilMidnightLocal(): number {
  const now = new Date();
  // Midnight in the user's LOCAL timezone
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1, // next day
    0, 0, 0, 0         // 00:00:00.000 local time
  );
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/** @deprecated Use getSecondsUntilMidnightLocal instead */
export function getSecondsUntilMidnightUTC(): number {
  return getSecondsUntilMidnightLocal();
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2;
}
