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
