/**
 * Immutable slug generator.
 * Takes the riddle question and produces a URL-safe, human-readable slug.
 * Appends a short random suffix to guarantee DB uniqueness.
 */
export function generateSlug(question: string): string {
  const words = question
    .toLowerCase()
    // Remove special characters, keep letters, numbers, spaces
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    // Take first 8 meaningful words (skip short connectors)
    .filter((w) => w.length > 1)
    .slice(0, 8);

  const base = words.join('-').slice(0, 55);

  // 6-char random suffix for uniqueness
  const suffix = Math.random().toString(36).slice(2, 8);

  return `${base}-${suffix}`;
}
