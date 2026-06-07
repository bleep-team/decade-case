/**
 * Formatter pinned to en-US and UTC so server and client render identically (no
 * hydration drift) while reading more friendly than a raw ISO string.
 */
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

/**
 * Render an ISO-8601 timestamp as a compact UTC string, e.g.
 * `2026-06-06T12:00:00.000Z` → `Jun 6, 2026, 12:00:00 UTC`.
 */
export function formatTime(iso: string): string {
  return `${timeFormatter.format(new Date(iso))} UTC`
}
