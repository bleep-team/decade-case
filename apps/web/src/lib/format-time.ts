/**
 * Render an ISO-8601 timestamp as a compact, locale-stable UTC string:
 * `2026-06-06T12:00:00.000Z` → `2026-06-06 12:00:00Z`. Locale-independent so
 * server and client render identically (no hydration drift).
 */
export function formatTime(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$/, 'Z')
}
