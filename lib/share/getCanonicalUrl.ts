/**
 * Returns canonical production URLs for riddles.
 * Uses NEXT_PUBLIC_APP_URL env var — falls back to localhost in dev.
 */
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'http://localhost:3000';

/**
 * Returns the immutable share URL for a riddle slug.
 * Example: https://riddle.advaita1.com/r/8-balls-two-weighings-abc123
 */
export function getRiddleShareUrl(slug: string): string {
  return `${BASE_URL}/r/${slug}`;
}

/**
 * Returns the site's base URL.
 */
export function getBaseUrl(): string {
  return BASE_URL;
}
