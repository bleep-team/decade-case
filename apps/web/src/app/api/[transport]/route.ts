import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { registerExchangeTools } from '@decade/mcp'
import { verifyClerkToken } from '@clerk/mcp-tools/next'
import { auth } from '@clerk/nextjs/server'
import { getDb } from '@decade/exchange-runtime'
import { createServiceBackend } from '@/lib/mcp/backend'

// The exchange MCP server, mounted behind a Streamable-HTTP transport. The
// `[transport]` segment resolves `/api/mcp` (and `/api/sse` for legacy clients);
// static API routes like `/api/orders` take precedence over this dynamic segment.
// Tools call the shared exchange service directly (no HTTP round-trip), acting as
// the broker resolved from the caller's identity.
const handler = createMcpHandler(
  (server) => registerExchangeTools(server, createServiceBackend(getDb())),
  { serverInfo: { name: 'decade-exchange', version: '0.0.1' } },
  { basePath: '/api', maxDuration: 60 },
)

/**
 * Authenticate every tool call. A Clerk **OAuth** token (the native add-by-URL
 * connector path) is verified first and carries the `userId`. Anything else that
 * is still a non-empty bearer is treated as a forwarded **API key** (the
 * `mcp-remote` path) and passed through for the tool to resolve by key hash. A
 * call with no credential at all is rejected `401` with a pointer to the
 * protected-resource metadata, per RFC 9728.
 */
const authHandler = withMcpAuth(
  handler,
  async (_request, bearerToken) => {
    if (!bearerToken) {
      return undefined
    }
    try {
      const clerkAuth = await auth({ acceptsToken: 'oauth_token' })
      const verified = verifyClerkToken(clerkAuth, bearerToken)
      if (verified) {
        return verified
      }
    } catch {
      // Not a valid OAuth token — fall through to the forwarded-API-key path.
    }
    return { token: bearerToken, scopes: [], clientId: 'api-key', extra: {} }
  },
  {
    required: true,
    resourceMetadataPath: '/.well-known/oauth-protected-resource/mcp',
  },
)

export { authHandler as GET, authHandler as POST }
