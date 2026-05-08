/**
 * In-memory concurrency lock for riddle generation.
 *
 * Problem: A double-click on "Generate More" fires two parallel
 * POST /api/riddles/generate requests. Without a lock, both hit
 * the Groq API and both insert rows — wasting credits and creating duplicates.
 *
 * Solution: Map<lockKey, Promise<T>>
 * The second request awaits the same Promise as the first.
 * Only one Groq call, one DB insert, one response shared.
 *
 * Scope: per-process. Works correctly on Vercel single-instance edge/serverless
 * within a single cold-start. For multi-region, the DB unique index on
 * (daily_date, difficulty) provides the distributed fallback guard.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lockMap = new Map<string, Promise<any>>();

/**
 * Acquires a lock for the given key.
 * If a lock already exists, awaits and returns the existing Promise.
 * If no lock exists, runs fn() and stores its Promise.
 *
 * @param key   - Unique identifier for the operation (e.g. `${sessionId}:${difficulty}`)
 * @param fn    - Async function to run exclusively
 */
export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = lockMap.get(key);
  if (existing) {
    // Second (or later) caller — await the in-flight Promise
    return existing as Promise<T>;
  }

  const promise = fn().finally(() => {
    // Release the lock once the operation completes (success or error)
    lockMap.delete(key);
  });

  lockMap.set(key, promise);
  return promise;
}
