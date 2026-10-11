/** Artwork used when an event has no cover image. Same patterns as the events template. */
export const EVENT_PATTERNS = [
  "radial-gradient(circle at 74% 38%, var(--primary) 0 21%, transparent 22%), linear-gradient(160deg, #2a0b10, #0a0a0c 70%)",
  "repeating-linear-gradient(135deg, var(--primary) 0 16px, #0a0a0c 16px 34px)",
  "radial-gradient(circle at 70% 40%, #0a0a0c 0 9%, transparent 10%), repeating-radial-gradient(circle at 70% 40%, var(--primary) 0 10px, #0a0a0c 10px 22px, #f6f5f2 22px 25px, #0a0a0c 25px 38px)",
  "radial-gradient(circle at 68% 45%, #0a0a0c 0 18%, transparent 19%), linear-gradient(100deg, #f6f5f2 0 50%, var(--primary) 50%)",
  "conic-gradient(from 200deg at 70% 40%, var(--primary), #0a0a0c 40%, #f6f5f2 70%, var(--primary))",
] as const;

/** The same event always gets the same pattern, wherever it is shown. */
export function eventPattern(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return EVENT_PATTERNS[hash % EVENT_PATTERNS.length]!;
}
