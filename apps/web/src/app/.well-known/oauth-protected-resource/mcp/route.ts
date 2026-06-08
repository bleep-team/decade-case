import {
  metadataCorsOptionsRequestHandler,
  protectedResourceHandlerClerk,
} from '@clerk/mcp-tools/next'

// OAuth 2.0 Protected Resource Metadata (RFC 9728) for the `/api/mcp` resource.
// The connector reads this to learn which authorization server guards the tools.
export const dynamic = 'force-dynamic'

export const GET = protectedResourceHandlerClerk({ scopes_supported: ['profile', 'email'] })
export const OPTIONS = metadataCorsOptionsRequestHandler()
