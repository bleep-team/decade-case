import {
  authServerMetadataHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from '@clerk/mcp-tools/next'

// OAuth 2.0 Authorization Server Metadata (RFC 8414) the connector discovers.
// Clerk derives it from the instance's publishable key.
export const dynamic = 'force-dynamic'

export const GET = authServerMetadataHandlerClerk()
export const OPTIONS = metadataCorsOptionsRequestHandler()
