import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// The exchange MCP server is defined in @decade/mcp (`createExchangeMcpServer`).
// Mounting it behind a Streamable-HTTP transport in this route handler — bridging
// the Web Request/Response to the SDK transport — is the remaining wiring step.
// Until then this endpoint advertises the available tools.
export function GET() {
  return NextResponse.json({
    server: 'decade-exchange',
    status: 'pending_transport',
    tools: ['submit_order', 'get_order', 'get_order_book', 'get_price', 'get_broker_balance'],
  })
}
