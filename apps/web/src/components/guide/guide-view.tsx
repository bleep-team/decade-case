import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { REPO_URL, repoPath } from '@/lib/site'
import { GuideNav } from './guide-nav'
import { ScrollTop } from './scroll-top'

/** A worked example shown as bid/ask chips resolving to an outcome. */
interface TradeExample {
  buy?: string
  sell?: string
  result: string
}

/** One requirement, in plain language, with how to try it. */
interface GuideItem {
  title: string
  /** What the case asks, in accessible words. */
  what: string
  /** A worked example from the brief, rendered as trade chips. */
  trade?: TradeExample
  /** A plain-text example, when chips do not fit. */
  note?: string
  /** Numbered "try it here" steps. */
  steps: string[]
  /** Where to go to try it. */
  action?: { href: string; label: string }
}

interface GuideSection {
  id: string
  title: string
  intro: string
  items: GuideItem[]
}

const TERMINAL = { href: '/app', label: 'Open the terminal' }
const DEVELOPER = { href: '/app/developer', label: 'Open the developer page' }

const SECTIONS: GuideSection[] = [
  {
    id: 'matching',
    title: 'How matching works',
    intro:
      'Brokers post buy (bid) and sell (ask) orders. The engine pairs a buyer and a seller for the same stock the moment their prices line up. A market maker is always quoting, so your orders can trade even when no one else is online.',
    items: [
      {
        title: 'Orders trade when prices cross',
        what: 'A bid is the most a buyer will pay; an ask is the least a seller will accept. They trade as soon as the bid is at or above the ask.',
        trade: { buy: '1,000 @ $10', sell: '1,000 @ $10', result: 'Both fill at $10' },
        steps: [
          'In the order ticket, choose Buy and Limit.',
          'Set a price at or above the best ask in the order book, add a quantity, and Submit.',
          'It fills instantly — watch the Fills tab and your Cash update live.',
        ],
        action: TERMINAL,
      },
      {
        title: 'No match when prices do not cross',
        what: 'If the highest bid is still below the lowest ask, nothing trades. Both orders wait on the book.',
        trade: { buy: '1,000 @ $10', sell: '1,000 @ $20', result: 'No trade' },
        steps: [
          'Place a Buy Limit well below the best ask — the ticket reads “Rests on the book”.',
          'Submit, then open the Orders tab: it sits there as “open” with nothing filled.',
        ],
        action: TERMINAL,
      },
      {
        title: 'A price gap fills at the seller’s price',
        what: 'When a buyer will pay more than the seller asks, the trade happens at the seller’s (ask) price. The buyer never overpays.',
        trade: { buy: '1,000 @ $20', sell: '1,000 @ $10', result: 'Fill at $10' },
        steps: [
          'Place a Buy Limit above the best ask and Submit.',
          'Open the Fills tab: the price is the ask, not your higher bid.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Big orders fill partially',
        what: 'One order can fill against several smaller ones. Whatever is left over stays on the book.',
        trade: { buy: '500', sell: '1,000', result: '500 fill, 500 rest' },
        steps: [
          'Place a Buy larger than the best ask’s quantity (shown in the order book).',
          'Submit, then open Orders: it shows “partially_filled” with a remaining quantity.',
        ],
        action: TERMINAL,
      },
      {
        title: 'Ties break by time',
        what: 'When two orders sit at the same price, the one submitted first trades first — price-time priority.',
        note: 'Two sells at $10: whoever posted first is matched first.',
        steps: [
          'Each price level in the order book shows how many orders rest there.',
          'Orders at one price always fill oldest-first; the engine enforces it.',
          'To see it directly, rest two buys at the same price and watch the earlier one fill first.',
        ],
        action: TERMINAL,
      },
    ],
  },
  {
    id: 'placing',
    title: 'Placing orders',
    intro:
      'Every order records who placed it, for which customer, what to trade, the price and quantity, and when it expires. Submit from the ticket here, or over the REST API.',
    items: [
      {
        title: 'Submit a buy or sell',
        what: 'An order carries a side (Buy/Sell), a type (Limit or Market), a quantity, a price, an expiry, and the customer’s document number. Your broker identity comes from your login, not the form.',
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
          'In the ticket, choose Market — the price field disables.',
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
    id: 'reading',
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
    id: 'developers',
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

/** Engineering decisions worth calling out, each linking to the repo for depth. */
const ARCHITECTURE: { lead: string; body: string; link?: { href: string; label: string } }[] = [
  {
    lead: 'A pure matching engine',
    body: 'Price-time matching is a pure, clock-free, database-free package, so every rule in the brief is exhaustively unit-tested in isolation.',
    link: { href: repoPath('docs/adr/0005-matching-engine.md'), label: 'ADR 0005' },
  },
  {
    lead: 'One writer per symbol',
    body: 'Matching runs on Inngest with per-symbol concurrency (limit 1), which makes price-time priority and partial fills race-free without application locks.',
    link: { href: repoPath('docs/adr/0004-inngest-jobs.md'), label: 'ADR 0004' },
  },
  {
    lead: 'Money is integer cents',
    body: 'Never floats. Each execution writes its trades, order updates, and broker balance moves in one database transaction.',
  },
  {
    lead: 'One core, three surfaces',
    body: 'The REST API, the trading terminal, and the MCP tools all run the same broker-scoped service, so the surfaces cannot drift apart.',
  },
]

const NAV = SECTIONS.map((s) => ({ id: s.id, title: s.title })).concat(
  { id: 'architecture', title: 'Under the hood' },
  { id: 'run', title: 'Run it yourself' },
)

function TradeChips({ buy, sell, result }: TradeExample) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
      {buy ? (
        <span className="rounded-md border border-gain/30 bg-gain/10 px-2 py-1 font-mono text-gain">
          BUY {buy}
        </span>
      ) : null}
      {sell ? (
        <span className="rounded-md border border-loss/30 bg-loss/10 px-2 py-1 font-mono text-loss">
          SELL {sell}
        </span>
      ) : null}
      <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span className="rounded-md border border-border bg-muted/50 px-2 py-1 font-mono text-foreground">
        {result}
      </span>
    </div>
  )
}

function Entry({ item, index }: { item: GuideItem; index: number }) {
  return (
    <li className="group grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4">
      <span className="pt-0.5 font-mono text-sm text-muted-foreground transition-colors group-hover:text-brand">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="space-y-3 border-b border-border/60 pb-7 last:border-0 last:pb-0">
        <h3 className="font-medium tracking-tight text-foreground">{item.title}</h3>
        <p className="text-sm text-muted-foreground">{item.what}</p>
        {item.trade ? <TradeChips {...item.trade} /> : null}
        {item.note ? (
          <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {item.note}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
            Try it here
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground marker:font-mono marker:text-xs marker:text-muted-foreground">
            {item.steps.map((step) => (
              <li key={step} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </div>
        {item.action ? (
          <Link
            href={item.action.href}
            className="group/link inline-flex items-center gap-1.5 rounded text-sm font-medium text-brand transition-colors hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {item.action.label}
            <ArrowRight
              className="size-3.5 transition-transform group-hover/link:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        ) : null}
      </div>
    </li>
  )
}

/**
 * The How-it-works page: a plain-language, editorial tour that maps each
 * capability of the exchange to a concrete way to verify it. The matching
 * examples render as bid/ask chips resolving to an outcome, so the page
 * demonstrates the product in its own visual language. Static and presentational;
 * the "try it here" actions link to the terminal and developer surfaces.
 */
export function GuideView() {
  return (
    <div className="relative mx-auto max-w-5xl pb-20">
      {/* Brand-accent glow behind the header. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-56 w-[40rem] max-w-full -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]"
      />

      <header className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand">Decade Exchange</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-3 text-muted-foreground">
          A short tour of what the exchange does and how to try each part yourself. A market maker
          is always quoting, so your orders can trade even when no one else is online. Use Reset
          demo in the header to start fresh anytime.
        </p>
      </header>

      <div className="mt-12 grid gap-12 lg:grid-cols-[180px_minmax(0,1fr)]">
        <GuideNav sections={NAV} />

        <div className="min-w-0 space-y-16">
          {SECTIONS.map((section, sectionIndex) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
              style={{ animationDelay: `${sectionIndex * 70}ms` }}
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm text-brand">
                  {String(sectionIndex + 1).padStart(2, '0')}
                </span>
                <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{section.intro}</p>
              <ul className="mt-6 space-y-7">
                {section.items.map((item, i) => (
                  <Entry key={item.title} item={item} index={i} />
                ))}
              </ul>
            </section>
          ))}

          <section
            id="architecture"
            className="scroll-mt-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
            style={{ animationDelay: `${SECTIONS.length * 70}ms` }}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-brand">
                {String(SECTIONS.length + 1).padStart(2, '0')}
              </span>
              <h2 className="text-xl font-semibold tracking-tight">Under the hood</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A few engineering choices worth calling out. Full detail lives in the repo&rsquo;s{' '}
              <a
                href={repoPath('docs/architecture/overview.md')}
                target="_blank"
                rel="noreferrer"
                className="rounded text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                architecture overview
              </a>{' '}
              and{' '}
              <a
                href={repoPath('docs/adr')}
                target="_blank"
                rel="noreferrer"
                className="rounded text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                decision records
              </a>
              .
            </p>
            <ul className="mt-6 space-y-4">
              {ARCHITECTURE.map((point) => (
                <li
                  key={point.lead}
                  className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4 border-b border-border/60 pb-4 last:border-0 last:pb-0"
                >
                  <span aria-hidden="true" className="pt-1 font-mono text-brand">
                    +
                  </span>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{point.lead}.</span> {point.body}
                    {point.link ? (
                      <>
                        {' '}
                        <a
                          href={point.link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 rounded font-medium text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {point.link.label}
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </a>
                      </>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            id="run"
            className="scroll-mt-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both motion-safe:duration-500"
            style={{ animationDelay: `${(SECTIONS.length + 1) * 70}ms` }}
          >
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-sm text-brand">
                {String(SECTIONS.length + 2).padStart(2, '0')}
              </span>
              <h2 className="text-xl font-semibold tracking-tight">Run it yourself</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              The whole stack — Postgres, migrations, the web app, and the jobs runtime — comes up
              from one command, in a reproducible container. Clone{' '}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                the repository
              </a>
              , then:
            </p>
            <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-2">
                <span className="font-mono text-xs text-muted-foreground">terminal</span>
              </div>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-sm text-foreground">
                <code>
                  <span className="select-none text-brand">$ </span>docker compose up --build
                </code>
              </pre>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Then open <code className="font-mono text-foreground">http://localhost:3000</code>,
              sign in, and place a trade.
            </p>
          </section>
        </div>
      </div>

      <ScrollTop />
    </div>
  )
}
