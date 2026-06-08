import { userAgent } from 'next/server'

/**
 * Mobile gate for the authenticated app shell.
 *
 * Reads the request user-agent via Next's `userAgent()` (`next/server`) and
 * returns `true` only when `device.type === 'mobile'` (a phone). Fails open:
 * unknown, empty, tablet, or unrecognized user-agents resolve to `false` and
 * pass through, so the gate never locks out a desktop on a parser hiccup. The
 * headers resolver is injected so this is unit-testable without a real Next.js
 * request context.
 */
export async function isMobileDevice(resolveHeaders: () => Promise<Headers>): Promise<boolean> {
  try {
    const headers = await resolveHeaders()
    const { device } = userAgent({ headers })
    return device.type === 'mobile'
  } catch {
    // Fail open on any unexpected parser / header error.
    return false
  }
}
