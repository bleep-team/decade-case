import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@decade/ui/components/card'

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

export interface IntegrationCardProps {
  /** The exchange origin; the MCP endpoint and REST examples are built from it. */
  baseUrl: string
}

/**
 * The integration panel: the MCP endpoint string, the list of MCP tools an agent
 * client can call, and a copy-paste REST curl quickstart — everything needed to
 * drive the exchange programmatically with the broker's API key.
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
          The same broker identity is reachable over MCP and REST with your API key.
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
          <ul className="grid gap-1">
            {MCP_TOOLS.map((tool) => (
              <li key={tool} className="font-mono text-sm">
                {tool}
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
