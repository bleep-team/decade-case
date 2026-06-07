import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@decade/ui/components/card'

/**
 * The exchange's MCP tool surface, mirroring `registerExchangeTools` in
 * `@decade/mcp`. Listed here so the Developer page documents exactly the tools an
 * agent client can call.
 */
export const MCP_TOOLS = [
  'submit_order',
  'get_order',
  'get_order_book',
  'get_price',
  'get_broker_balance',
] as const

/** One-line description of what each MCP tool does, shown beside its name. */
const TOOL_DESCRIPTIONS: Record<(typeof MCP_TOOLS)[number], string> = {
  submit_order: 'Place a bid or ask (limit or market) for a symbol; returns the order id.',
  get_order: "Look up an order's status, filled and remaining quantity, and details by id.",
  get_order_book: 'Read the top bids and asks for a symbol, at a configurable depth.',
  get_price: 'Get the current price for a symbol (the best bid/ask midpoint).',
  get_broker_balance: 'Return your cash balance and share positions.',
}

/** REST endpoints the API key reaches, mirroring the routes under `/api`. */
const REST_ENDPOINTS: Array<{ method: string; path: string; summary: string }> = [
  { method: 'POST', path: '/api/orders', summary: 'Submit a bid/ask order.' },
  { method: 'GET', path: '/api/orders/:id', summary: 'Get an order by id.' },
  { method: 'GET', path: '/api/orders', summary: 'List your orders.' },
  { method: 'GET', path: '/api/trades', summary: 'List your trades.' },
  { method: 'GET', path: '/api/stocks/:symbol/book', summary: 'Order book for a symbol.' },
  { method: 'GET', path: '/api/stocks/:symbol/price', summary: 'Current price for a symbol.' },
  { method: 'GET', path: '/api/brokers/:id/balance', summary: 'Cash balance and positions.' },
]

export interface IntegrationCardProps {
  /** The exchange origin; the MCP endpoint and REST examples are built from it. */
  baseUrl: string
}

/**
 * The integration panel: the MCP endpoint, the MCP tools an agent client can call
 * (with descriptions), the REST endpoints the key reaches, and a copy-paste curl
 * quickstart — everything needed to drive the exchange with the broker's API key.
 */
export function IntegrationCard({ baseUrl }: IntegrationCardProps) {
  const mcpEndpoint = `${baseUrl}/api/mcp`
  const curl = [
    `curl -X POST ${baseUrl}/api/orders \\`,
    `  -H "Authorization: Bearer $DECADE_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"symbol":"AAPL","side":"bid","type":"limit","limitPrice":150.00,"quantity":10,"ownerDocument":"DEMO-0001"}'`,
  ].join('\n')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Integrate</CardTitle>
        <CardDescription>
          The same broker identity is reachable over MCP and REST with your API key, sent as an{' '}
          <code>Authorization: Bearer</code> header.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">MCP endpoint</h3>
          <code className="block overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm">
            {mcpEndpoint}
          </code>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">MCP tools</h3>
          <ul className="space-y-2">
            {MCP_TOOLS.map((tool) => (
              <li key={tool} className="space-y-0.5">
                <code className="font-mono text-sm text-foreground">{tool}</code>
                <p className="text-sm text-muted-foreground">{TOOL_DESCRIPTIONS[tool]}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">REST endpoints</h3>
          <ul className="space-y-1">
            {REST_ENDPOINTS.map((endpoint) => (
              <li key={`${endpoint.method} ${endpoint.path}`} className="text-sm">
                <code className="font-mono">
                  <span className="text-muted-foreground">{endpoint.method}</span>{' '}
                  <span className="text-foreground">{endpoint.path}</span>
                </code>
                <span className="ml-2 text-muted-foreground">{endpoint.summary}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">REST quickstart</h3>
          <pre
            aria-label="REST quickstart"
            className="overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs"
          >
            <code>{curl}</code>
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
