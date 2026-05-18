/**
 * Daily puzzle calendar + countdown
 *
 * Official "day" boundary uses NEXT_PUBLIC_DAILY_TIMEZONE (default Asia/Kolkata = IST).
 * Streaks, solved-today, cron idempotency, and URLs for "today" should all use the same
 * calendar date from getOfficialDailyDate().
 *
 * ALL daily logic MUST use Asia/Kolkata. Never rely on local browser timezone,
 * server timezone, or UTC midnight assumptions.
 */

export const OFFICIAL_DAILY_TZ =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DAILY_TIMEZONE
    ? process.env.NEXT_PUBLIC_DAILY_TIMEZONE
    : 'Asia/Kolkata';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OFFICIAL_DAILY_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// ── Canonical IST Date Utilities ────────────────────────────────────

/** YYYY-MM-DD for the official daily calendar in OFFICIAL_DAILY_TZ. */
export function getOfficialDailyDate(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/**
 * Canonical alias for getOfficialDailyDate().
 * Use this everywhere daily logic needs "today's date in IST".
 */
export function getCurrentISTDate(): string {
  return getOfficialDailyDate();
}

/**
 * Deterministic daily key — YYYY-MM-DD in IST.
 * Use for DB lookups, cache keys, localStorage keys.
 * NEVER use new Date().toISOString().slice(0, 10) — that's UTC.
 */
export function getDailyKeyIST(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/**
 * Returns a Date object for the next midnight in IST.
 * Useful for computing countdown timers and cron scheduling.
 */
export function getNextISTMidnight(nowMs: number = Date.now()): Date {
  const startDay = dayFormatter.format(new Date(nowMs));
  let lo = nowMs;
  let hi = nowMs + 48 * 3600000;
  if (dayFormatter.format(new Date(hi)) === startDay) {
    hi = nowMs + 8 * 24 * 3600000;
  }
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    if (dayFormatter.format(new Date(mid)) === startDay) lo = mid;
    else hi = mid;
  }
  return new Date(hi);
}

/**
 * Returns { start, end } as ISO timestamps bounding the current IST day.
 * Useful for DB range queries (WHERE created_at >= start AND created_at < end).
 */
export function getISTDayBoundaryRange(now: Date = new Date()): { start: string; end: string } {
  const todayKey = getDailyKeyIST(now);
  const tomorrowKey = addOfficialCalendarDays(todayKey, 1);

  // Convert IST YYYY-MM-DD to UTC ISO timestamps
  // IST is UTC+5:30, so midnight IST = 18:30 UTC previous day
  const startUTC = istMidnightToUTC(todayKey);
  const endUTC = istMidnightToUTC(tomorrowKey);

  return { start: startUTC, end: endUTC };
}

/**
 * Converts an IST midnight YYYY-MM-DD to a UTC ISO timestamp.
 * e.g. "2026-05-18" IST midnight → "2026-05-17T18:30:00.000Z"
 */
function istMidnightToUTC(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  // Create a date at midnight in IST by subtracting 5h30m from midnight
  const utc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  // IST = UTC+5:30, so midnight IST = 18:30 previous day UTC
  utc.setUTCHours(utc.getUTCHours() - 5);
  utc.setUTCMinutes(utc.getUTCMinutes() - 30);
  return utc.toISOString();
}

// ── Legacy aliases & helpers ────────────────────────────────────────

/** Previous official calendar day (for streak continuity). */
export function getYesterdayOfficial(): string {
  return addOfficialCalendarDays(getOfficialDailyDate(), -1);
}

/**
 * Seconds until the next midnight in OFFICIAL_DAILY_TZ (binary search on wall-clock day).
 */
export function getSecondsUntilOfficialMidnight(nowMs: number = Date.now()): number {
  const nextMidnight = getNextISTMidnight(nowMs);
  return Math.max(0, Math.ceil((nextMidnight.getTime() - nowMs) / 1000));
}

export function getSecondsUntilMidnightLocal(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2;
}

/** Add signed calendar days to an official YYYY-MM-DD (Gregorian, interpreted in OFFICIAL_DAILY_TZ civil sense). */
export function addOfficialCalendarDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const u = new Date(Date.UTC(y, m - 1, d + delta));
  return dayFormatter.format(u);
}

/** Official YYYY-MM-DD for the instant `iso` (UTC string or Date) in OFFICIAL_DAILY_TZ. */
export function toOfficialDateFromInstant(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return dayFormatter.format(d);
}

/** Short label for UI, e.g. "IST" or "GMT+5:30" — best-effort from runtime. */
export function getOfficialTimezoneShort(): string {
  if (OFFICIAL_DAILY_TZ === 'Asia/Kolkata') return 'IST';
  return OFFICIAL_DAILY_TZ.split('/').pop() ?? OFFICIAL_DAILY_TZ;
}
