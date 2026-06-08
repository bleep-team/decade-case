import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { EXCHANGE_INSTRUCTIONS, registerExchangeTools } from '@decade/mcp'
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
  {
    serverInfo: { name: 'decade-exchange', version: '0.0.1' },
    instructions: EXCHANGE_INSTRUCTIONS,
  },
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

// An MCP client (Claude Desktop, claude.ai) calls this endpoint cross-origin, so
// the transport's responses need CORS — and critically `WWW-Authenticate` must be
// exposed, or the client cannot read the 401 OAuth pointer and the connect hangs
// at "Checking connection". `Mcp-Session-Id` is exposed so the client can resume
// a streamable-HTTP session. A bearer (not a cookie) authenticates, so `*` origin
// is safe — no credentialed requests are involved.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Accept',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
}

function withCors(response: Response): Response {
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

async function handleRequest(request: Request): Promise<Response> {
  return withCors(await authHandler(request))
}

export const GET = handleRequest
export const POST = handleRequest

/** CORS preflight for the cross-origin MCP client. */
export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
