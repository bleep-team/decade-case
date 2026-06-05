import { createMcpHandler } from 'mcp-handler'
import { registerExchangeTools } from '@decade/mcp'

// The exchange MCP server, mounted behind a Streamable-HTTP transport. The
// `[transport]` segment resolves `/api/mcp` (and `/api/sse` for legacy clients);
// static API routes like `/api/orders` take precedence over this dynamic segment.
// Tools call the exchange's own REST API, so we point them at this app's origin.
const baseUrl =
  process.env['NEXT_PUBLIC_APP_URL'] ??
  (process.env['VERCEL_PROJECT_PRODUCTION_URL']
    ? `https://${process.env['VERCEL_PROJECT_PRODUCTION_URL']}`
    : 'http://localhost:3000')

const handler = createMcpHandler(
  (server) => registerExchangeTools(server, { baseUrl }),
  { serverInfo: { name: 'decade-exchange', version: '0.0.1' } },
  { basePath: '/api', maxDuration: 60 },
)

export { handler as GET, handler as POST }
