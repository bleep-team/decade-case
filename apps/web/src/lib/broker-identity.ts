import { NextResponse } from 'next/server'
import type { Broker } from '@decade/db'
import { resolveBrokerByApiKey, resolveOrCreateBroker, UnauthorizedError } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { getDb } from '@decade/exchange-runtime'

/** Pull a `Bearer <key>` credential out of the Authorization header, if present. */
function extractBearerKey(request: Request): string | null {
  const header = request.headers.get('authorization')
  if (!header) {
    return null
  }
  const [scheme, value] = header.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !value) {
    return null
  }
  return value
}

/**
 * Resolve the broker acting on a request. A presented API key (Authorization:
 * Bearer) is the programmatic/MCP credential; otherwise the broker is derived
 * from the Clerk session (auto-provisioned on first login). Throws
 * `UnauthorizedError` for an unknown key or an anonymous request.
 *
 * The acting broker is always the identity's — request bodies never name the broker.
 */
export async function resolveActingBroker(request: Request): Promise<Broker> {
  const db = getDb()

  const presentedKey = extractBearerKey(request)
  if (presentedKey) {
    const broker = await resolveBrokerByApiKey(db, presentedKey)
    if (!broker) {
      throw new UnauthorizedError('invalid API key')
    }
    return broker
  }

  const userId = await requireUserId()
  return resolveOrCreateBroker(db, userId)
}

/**
 * Resolve the acting broker, turning an auth failure into a 401 response the
 * route handler can return as-is. Returns either the broker or a `NextResponse`;
 * callers branch with `instanceof NextResponse`. Non-auth errors still throw.
 */
export async function resolveActingBrokerOr401(request: Request): Promise<Broker | NextResponse> {
  try {
    return await resolveActingBroker(request)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    throw error
  }
}
