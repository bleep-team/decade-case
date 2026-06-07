import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@decade/ui/components/card'
import { CodeBlock } from './code-block'
import { RestEndpoints } from './rest-endpoints'

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

export interface IntegrationCardProps {
  /** The exchange origin; the MCP endpoint and REST examples are built from it. */
  baseUrl: string
}

/** A small uppercase section label, in the Stripe reference idiom. */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  )
}

/**
 * The integration panel: the MCP endpoint, the MCP tools an agent client can call
 * (with descriptions), the REST endpoints the key reaches, and a copy-paste curl
 * quickstart — laid out as a reference doc so the surface reads professionally.
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
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            Authorization: Bearer
          </code>{' '}
          header.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <SectionHeading>MCP endpoint</SectionHeading>
          <CodeBlock label="Streamable HTTP" code={mcpEndpoint} />
        </section>

        <section className="space-y-2">
          <SectionHeading>MCP tools</SectionHeading>
          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {MCP_TOOLS.map((tool) => (
              <div
                key={tool}
                className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3"
              >
                <code className="font-mono text-sm text-brand">{tool}</code>
                <span className="text-sm text-muted-foreground">{TOOL_DESCRIPTIONS[tool]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <SectionHeading>REST endpoints</SectionHeading>
          <RestEndpoints />
        </section>

        <section className="space-y-2">
          <SectionHeading>Example request</SectionHeading>
          <CodeBlock label="cURL" code={curl} ariaLabel="REST quickstart" />
        </section>
      </CardContent>
    </Card>
  )
}
