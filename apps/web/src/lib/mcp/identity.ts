import { resolveBrokerByApiKey, resolveOrCreateBroker, UnauthorizedError } from '@decade/auth'
import type { Broker, Database } from '@decade/db'
import type { McpIdentity } from '@decade/mcp'

/**
 * Resolve the broker an MCP tool acts as, from the caller's identity.
 *
 * - An **OAuth** `userId` (a Clerk-verified token) auto-provisions/loads the
 *   broker keyed by that user — the native add-by-URL connector path.
 * - A forwarded **API key** (the `mcp-remote` path) resolves the broker by its
 *   stored key hash.
 *
 * Both converge on the same broker-scoped service. An anonymous call, or a key
 * that matches no broker, raises `UnauthorizedError`.
 */
export async function resolveMcpBroker(db: Database, identity: McpIdentity): Promise<Broker> {
  if (identity.userId) {
    return resolveOrCreateBroker(db, identity.userId)
  }

  if (identity.apiKey) {
    const broker = await resolveBrokerByApiKey(db, identity.apiKey)
    if (!broker) {
      throw new UnauthorizedError('invalid API key')
    }
    return broker
  }

  throw new UnauthorizedError('no broker identity')
}
