import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from '@clerk/mcp-tools/next'
import { publicOriginRequest } from '@/lib/forwarded-url'

// OAuth 2.0 Protected Resource Metadata (RFC 9728) for the `/api/mcp` resource.
// The connector reads this to learn which authorization server guards the tools.
export const dynamic = 'force-dynamic'

const handler = protectedResourceHandlerClerk({ scopes_supported: ['profile', 'email'] })

/**
 * Clerk derives the advertised `resource` from `new URL(req.url).origin`, which
 * behind a tunnel or reverse proxy is the internal origin (e.g. localhost), not
 * the public URL the connector reached. Rebuild the request from the forwarded
 * headers first so the resource matches the issued token's audience.
 */
export function GET(req: Request): Response {
  return handler(publicOriginRequest(req)) as Response
}

export const OPTIONS = metadataCorsOptionsRequestHandler()
