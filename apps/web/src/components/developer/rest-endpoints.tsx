'use client'

import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@decade/ui/components/collapsible'
import { cn } from '@decade/ui/lib/utils'
import { CodeBlock } from './code-block'

interface Endpoint {
  method: string
  path: string
  summary: string
  /** Whether the example is the request body (POST) or a response (GET). */
  exampleLabel: string
  example: string
}

/** REST endpoints the API key reaches, each with an example body or response. */
const ENDPOINTS: Endpoint[] = [
  {
    method: 'POST',
    path: '/api/orders',
    summary: 'Submit a bid/ask order.',
    exampleLabel: 'Request body',
    example: `{
  "symbol": "AAPL",
  "side": "bid",
  "type": "limit",
  "limitPrice": 150.00,
  "quantity": 10,
  "ownerDocument": "DEMO-0001"
}`,
  },
  {
    method: 'GET',
    path: '/api/orders/:id',
    summary: 'Get an order by id.',
    exampleLabel: 'Response',
    example: `{
  "orderId": "6845b95a…",
  "symbol": "AAPL",
  "side": "bid",
  "type": "limit",
  "limitPriceCents": 15000,
  "quantity": 10,
  "remaining": 0,
  "status": "filled"
}`,
  },
  {
    method: 'GET',
    path: '/api/orders',
    summary: 'List your orders.',
    exampleLabel: 'Response',
    example: `{ "orders": [ { "orderId": "…", "symbol": "AAPL", "status": "open", … } ] }`,
  },
  {
    method: 'GET',
    path: '/api/trades',
    summary: 'List your trades.',
    exampleLabel: 'Response',
    example: `{ "trades": [ { "tradeId": "…", "symbol": "AAPL", "priceCents": 19011, "quantity": 10 } ] }`,
  },
  {
    method: 'GET',
    path: '/api/stocks/:symbol/book',
    summary: 'Order book for a symbol.',
    exampleLabel: 'Response',
    example: `{
  "symbol": "AAPL",
  "bids": [ { "price": 19011, "quantity": 100, "orderCount": 1 } ],
  "asks": [ { "price": 19031, "quantity": 100, "orderCount": 1 } ]
}`,
  },
  {
    method: 'GET',
    path: '/api/stocks/:symbol/price',
    summary: 'Current price for a symbol.',
    exampleLabel: 'Response',
    example: `{ "symbol": "AAPL", "price": 19021, "sampleSize": 12 }`,
  },
  {
    method: 'GET',
    path: '/api/brokers/:id/balance',
    summary: 'Cash balance and positions.',
    exampleLabel: 'Response',
    example: `{
  "cashBalanceCents": 100000000,
  "positions": [ { "symbol": "AAPL", "quantity": 10 } ]
}`,
  },
]

/** An HTTP method pill — POST carries the brand accent, reads start as muted. */
function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-11 shrink-0 justify-center rounded border px-1 py-0.5 font-mono text-[0.625rem] font-semibold uppercase tracking-wide',
        method === 'POST'
          ? 'border-brand/30 bg-brand/10 text-brand'
          : 'border-border bg-muted text-muted-foreground',
      )}
    >
      {method}
    </span>
  )
}

/**
 * The REST endpoint reference: a divided list where each row expands on click to
 * reveal an example request body or response, in the Stripe API-reference idiom.
 */
export function RestEndpoints() {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
      {ENDPOINTS.map((endpoint) => (
        <Collapsible key={`${endpoint.method} ${endpoint.path}`}>
          <CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <MethodBadge method={endpoint.method} />
            <code className="font-mono text-sm text-foreground">{endpoint.path}</code>
            <span className="hidden text-sm text-muted-foreground md:block">
              {endpoint.summary}
            </span>
            <ChevronDown
              className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
              aria-hidden="true"
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <CodeBlock label={endpoint.exampleLabel} code={endpoint.example} />
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}
