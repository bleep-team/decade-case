import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@decade/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@decade/ui/components/card'

/** One requirement, in plain language, with a worked example and how to try it. */
interface GuideItem {
  title: string
  /** What the case asks, in accessible words. */
  what: string
  /** A worked example lifted from the brief, when one helps. */
  example?: string
  /** Numbered "try it here" steps. */
  steps: string[]
  /** Where to go to try it. */
  action?: { href: string; label: string }
}

interface GuideSection {
  title: string
  intro: string
  items: GuideItem[]
}

const TERMINAL = { href: '/app', label: 'Open the terminal' }
const DEVELOPER = { href: '/app/developer', label: 'Open the developer page' }

const SECTIONS: GuideSection[] = [
  {
    title: 'How matching works',
    intro:
      'Brokers post buy (bid) and sell (ask) orders. The engine pairs a buyer and a seller for the same stock as soon as their prices line up. A market maker is always quoting, so your orders can trade even when no one else is online.',
    items: [
      {
        title: 'Orders trade when prices cross',
        what: 'A bid is the most a buyer will pay; an ask is the least a seller will accept. They trade as soon as the bid is at or above the ask.',
        example: 'Sell 1,000 AAPL at $10 and buy 1,000 at $10. Both fill at $10.',
        steps: [
          'In the order ticket, choose Buy and Limit.',
          'Set a price at or above the best ask shown in the order book, add a quantity, and Submit.',
          'It fills instantly. Watch the Fills tab and your Cash update live.',
        ],
        action: TERMINAL,
      },
      {
        title: 'No match when prices do not cross',
        what: 'If the highest bid is still below the lowest ask, nothing trades. Both orders wait on the book.',
        example: 'Sell 1,000 at $20, buy 1,000 at $10. Neither executes.',
        steps: [
          'Place a Buy Limit well below the best ask. The ticket reads "Rests on the book".',
          'Submit, then open the Orders tab: it sits there as "open" with nothing filled.',
        ],
        action: TERMINAL,
      },
      {
        title: 'A price gap fills at the seller’s price',
        what: 'When a buyer will pay more than the seller asks, the trade happens at the seller’s (ask) price. The buyer never overpays.',
        example: 'Sell at $10, buy at $20. Both execute at $10.',
        steps: [
          'Place a Buy Limit above the best ask and Submit.',
          'Open the Fills tab: the price is the ask, not your higher bid.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Big orders fill partially',
        what: 'One order can fill against several smaller ones. Whatever is left over stays on the book.',
        example: 'Sell 1,000, buy 500. 500 trade now; 500 remain for later.',
        steps: [
          'Place a Buy larger than the best ask’s quantity (shown in the order book).',
          'Submit, then open Orders: it shows "partially_filled" with a remaining quantity.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Ties break by time',
        what: 'When two orders sit at the same price, the one submitted first trades first (price-time priority).',
        example: 'Two sells at $10. Whoever posted first is matched first.',
        steps: [
          'Each price level in the order book shows how many orders rest there.',
          'Orders at one price are always filled oldest-first; the engine enforces it.',
          'To see it directly, rest two buys at the same price and watch the earlier one fill first.',
        ],
        action: TERMINAL,
      },
    ],
  },
  {
    title: 'Placing orders',
    intro:
      'Every order records who placed it, for which customer, what to trade, the price and quantity, and when it expires. Submit from the ticket here, or over the REST API.',
    items: [
      {
        title: 'Submit a buy or sell',
        what: 'An order has a side (Buy/Sell), a type (Limit or Market), a quantity, a price, an expiry, and the customer’s document number. Your broker identity comes from your login, not the form.',
        steps: [
          'Fill the order ticket and Submit.',
          'You get back an order id, and the order appears in your Orders tab.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Market orders',
        what: 'A market order skips the price and takes the best available immediately. Any quantity it cannot fill is cancelled, never left resting.',
        steps: [
          'In the ticket, choose Market. The price field disables.',
          'Set a quantity and Submit, then open Fills to see it executed at the maker’s price.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Check an order’s status',
        what: 'Submitting returns an order id you can use to look the order up later.',
        steps: [
          'See the Orders tab for live status, or',
          'Call GET /api/orders/{id} with your API key (see the developer page).',
        ],
        action: DEVELOPER,
      },
    ],
  },
  {
    title: 'Reading the market',
    intro:
      'The terminal shows the price, the book, and your balance live. Each is also a REST endpoint.',
    items: [
      {
        title: 'Current price',
        what: 'The current price is the midpoint of the best bid and ask, and it drifts as the market maker re-quotes.',
        steps: [
          'The price card at the top of the terminal shows it.',
          'Or call GET /api/stocks/{symbol}/price.',
        ],
        action: TERMINAL,
      },
      {
        title: 'The order book',
        what: 'The book lists the best buy and sell orders for a stock, with the quantity and how many orders rest at each price.',
        steps: [
          'The Order book panel on the terminal shows the top of the book.',
          'Or call GET /api/stocks/{symbol}/book?depth=10.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Your balance',
        what: 'Your broker starts with $1,000,000 in virtual cash. Buys spend cash and add shares; sells do the reverse.',
        steps: [
          'The You panel shows your Cash, Holdings, and Fills.',
          'Or call GET /api/brokers/{id}/balance.',
        ],
        action: TERMINAL,
      },
    ],
  },
  {
    title: 'For developers',
    intro:
      'Everything in the terminal is also a REST endpoint, a signed webhook, and an MCP tool for AI agents.',
    items: [
      {
        title: 'REST API and your key',
        what: 'Every action is a REST endpoint. Authenticate with your personal API key as a bearer token.',
        steps: ['Open the developer page for your API key and copy-paste curl examples.'],
        action: DEVELOPER,
      },
      {
        title: 'Execution webhooks',
        what: 'Register an endpoint and the exchange sends a signed POST every time one of your orders fills.',
        steps: [
          'On the developer page, add a webhook URL and save.',
          'Place an order that fills; your endpoint receives a signed trade.executed POST.',
          'Verify it by recomputing the HMAC with your signing secret.',
        ],
        action: DEVELOPER,
      },
      {
        title: 'MCP for AI agents',
        what: 'The same tools are exposed over MCP, so an assistant like Claude can read the book and place orders as your broker.',
        steps: ['The developer page lists the MCP endpoint and the available tools.'],
        action: DEVELOPER,
      },
    ],
  },
]

const DOCKER_COMMAND = 'docker compose up --build'

/**
 * The Guide page: a plain-language tour that maps the exchange’s capabilities to
 * how a reviewer can try each one in the app. Static and presentational; the
 * "try it here" actions link to the terminal and developer surfaces.
 */
export function GuideView() {
  return (
    <div className="mx-auto max-w-3xl space-y-12 pb-12">
      <header className="space-y-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 ring-1 ring-brand/20">
          <BookOpen className="size-5 text-brand" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Guide</h1>
        <p className="text-muted-foreground">
          A short tour of what the exchange does and how to try each part yourself. A market maker
          is always quoting, so your orders can trade even when no one else is online. Use Reset
          demo in the header anytime to start fresh.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.intro}</p>
          </div>
          <div className="space-y-4">
            {section.items.map((item) => (
              <Card key={item.title}>
                <CardHeader>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground">{item.what}</p>
                  {item.example ? (
                    <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Example. </span>
                      {item.example}
                    </p>
                  ) : null}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Try it here
                    </p>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground marker:text-muted-foreground">
                      {item.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  {item.action ? (
                    <Button asChild size="sm" variant="outline">
                      <Link href={item.action.href}>
                        {item.action.label}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight">Run it yourself</h2>
          <p className="text-sm text-muted-foreground">
            The whole stack (Postgres, migrations, the web app, and the jobs runtime) comes up from
            one command, in a reproducible container.
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
              <code>{DOCKER_COMMAND}</code>
            </pre>
            <p className="text-sm text-muted-foreground">
              Then open <code>http://localhost:3000</code>, sign in, and place a trade.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
