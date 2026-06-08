# Package Guide

Every internal library is built with **tsup to ESM + DTS** and tested with
colocated `*.test.ts` (Vitest). `@decade/ui` is the sole exception — it is not
built (see below). Packages are grouped by role below.

## Package Categories

### Shared Config

Configuration-only packages — no runtime code, extended by everything else.

#### `@decade/typescript-config`

Shared TypeScript bases that other packages extend via `"extends"`.

- `base.json` — strict mode, modern module resolution
- `react.json` — extends base with JSX + DOM libs
- `library.json` — extends base with declaration maps and composite builds

#### `@decade/eslint-config`

Shared ESLint **flat** config. Named exports `base` and `nextjs` (the latter
relaxes the no-default-export rule for Next pages/layouts/route handlers).
Enforces TypeScript recommended rules, `no-explicit-any`, no default exports, and
unused-vars-as-errors.

### Domain Core

The pure heart of the system: vocabulary and matching logic, no I/O.

#### `@decade/types`

One-line: shared domain primitives every other package speaks.

- Exports: `Cents` and money helpers (`dollarsToCents`, `centsToDollars`,
  `formatUsd`, `notional`); order types (`BrokerId`, `OrderId`, `OrderSide`,
  `OrderType`, `OrderStatus`, `SubmitOrderInput`, `Order`); `TradeId` / `Trade`;
  and book shapes (`OrderBookLevel`, `OrderBookSnapshot`, `BookSide`).
- Money is **integer cents** everywhere — never floats, never dollars in logic.

#### `@decade/matching-engine`

One-line: pure, deterministic price-time-priority matching.

- Exports: `matchOrder` (+ `ProposedTrade`, `MatchResult`), `buildOrderBook`,
  `bestBid`, `bestAsk`, `midpoint`, `movingAverage`, `restingPriority`,
  `excludeExpired`, `truncateToBudget`.
- **Pure: no database, no clock, no id generation.** `matchOrder(incoming,
restingBook)` returns proposed trades and updated order states; the runtime
  excludes expired orders and assigns trade ids/timestamps at persistence time.
- Exhaustively unit-tested — `src/match.test.ts` encodes every example from the
  brief (same price, no match, price gap, partial fills, chronological priority,
  market orders, symbol/side isolation, input immutability).

### Data & Identity

The stateful boundary: persistence and who-is-this.

#### `@decade/db`

One-line: Drizzle schema, migrations, and a `pg`-backed client.

- Exports: `createDbClient` (+ `Database` type), the tables (`brokers`, `stocks`,
  `orders`, `trades`, `positions`, `webhookEndpoints`, `webhookDeliveries`) and
  their enums, the inferred row types (`Broker`, `NewOrder`, `TradeRow`,
  `Position`, `StockRow`, …), `toDomainOrder` (row → `@decade/types` `Order`),
  and seed helpers (`seedStocks`, `seedMockBrokers`, `seedMarketData`).
- `createDbClient` uses the **`pg` (node-postgres)** driver for full interactive
  transactions; the same client runs against local Postgres and Neon.
- Ships a separate test harness at `@decade/db/testing` (`createTestDb`) backed by
  **in-process pglite** — no external Postgres, so DB-backed logic is testable in
  CI and the sandcastle container.

#### `@decade/auth`

One-line: Clerk integration, broker identity, and API keys.

- Exports: `UnauthorizedError`; API-key primitives (`generateApiKey`,
  `hashApiKey`, `verifyApiKey`); broker resolution (`resolveOrCreateBroker`,
  `resolveBrokerByApiKey`, `rotateApiKey`, `ResolveBrokerOptions`,
  `STARTING_BALANCE_CENTS`). A `@decade/auth/server` subpath re-exports Clerk's
  `auth` / `currentUser` plus `requireUserId()`.
- API keys are `dk_`-prefixed and SHA-256 hashed; only the hash is persisted
  (`brokers.api_key_hash`), constant-time compared on verify. The same credential
  authenticates both the REST API and the MCP surface.

### Runtime & Surfaces

Where the system actually does things and is reached from outside.

#### `@decade/exchange-runtime`

One-line: the Inngest jobs layer plus all persistence, settlement, realtime, and
webhook logic.

- Exports the Inngest `inngest` client, the `functions` array (`matchOrderFn`,
  `cancelOrderFn`, `expireOrdersFn`, `deliverWebhookFn`, `marketMakerFn`,
  `marketMakerCronFn`), and the event types (`ExchangeEvents`, …).
- Owns the **"persist" side** of the decide/persist split: `persistMatchResult`
  (writes trades, order updates, and broker balance moves in **one
  transaction**), `computeSettlementDeltas`, and `runMatch` / `executeMatch`
  driving a match end to end.
- `match-order` consumes `order/submitted` with **per-symbol concurrency
  (`key: symbol, limit: 1`)** — a single writer per symbol.
- Also owns: the buying-power guard (`availableBuyingPowerCents`,
  `hasBuyingPowerFor` — an underfunded limit buy is recorded `rejected`), order
  cancel (`runCancel`), the market maker (`runMarketMaker`, `generateQuoteLadder`,
  `stepReference`), the demo reset (`runDemoReset`), **Inngest Realtime** push
  (`brokerChannel`, `publishBrokerUpdate`, `deriveBrokerUpdates`,
  `publishSettlement`), and pure webhook helpers (`buildWebhookPayload`,
  `signPayload`, `webhookHeaders`, `SIGNATURE_HEADER` — HMAC-SHA256).

#### `@decade/mcp`

One-line: an MCP server that exposes the exchange as tools — **transport-only**,
no business logic.

- Exports: `createExchangeMcpServer`, `registerExchangeTools`,
  `EXCHANGE_INSTRUCTIONS`, the `ExchangeToolBackend` / `ToolResult` types, the Zod
  tool-arg shapes (`submitOrderShape`, `orderIdShape`, …), and identity helpers
  (`identityFromExtra`, `bearerFromExtra`, `userIdFromExtra`, `McpIdentity`).
- The tools (`submit_order`, `get_order`, `get_order_book`, `get_price`,
  `get_broker_balance`) own no logic: they distil the caller's identity from the
  transport's auth and **dispatch to a host-supplied `ExchangeToolBackend`**,
  which resolves the broker and runs the same broker-scoped `exchange-service` the
  REST routes use. The acting broker always comes from the identity, never the
  tool arguments.
- `apps/web` mounts it at `/api/mcp` behind a Streamable-HTTP transport,
  accepting a Clerk OAuth token or a forwarded API key.

### UI

#### `@decade/ui`

One-line: the shared shadcn/ui design system.

- **The non-built, transpiled package.** It ships `.tsx`/`.ts` source directly
  and is consumed via Next's `transpilePackages: ['@decade/ui']` — so it has no
  `src/index.ts` barrel and its internal imports are **extensionless** (every
  other `@decade/*` package uses `.js` specifiers).
- Subpath `exports` map only — apps bundle just what they import:
  `@decade/ui/components/*`, `@decade/ui/hooks/*`, `@decade/ui/lib/*`,
  `@decade/ui/styles/globals.css`.
- shadcn is initialized **inside this package** (`components.json`: `new-york`
  style, `neutral` base). Design tokens live CSS-first in
  `src/styles/globals.css` via Tailwind v4 `@theme`: a raw neutral brand layer
  (`--ink`, `--paper`, `--silver`), the single warm orange accent (`--brand`),
  market-data tokens (`--gain` / `--loss`), and the semantic shadcn aliases.
- **Single dark theme, no light mode; one typeface (Inter).**

### Observability

#### `@decade/logger`

One-line: structured JSON logging.

- Exports: `createLogger` (+ `Logger` type), `createConsoleTransport`, and the
  `LogContext` / `LogEntry` / `LogTransport` types.
- `createLogger(context, transport)` returns an `info` / `warn` / `error` logger
  that merges bound context (`requestId`, `brokerId`, `orderId`, `symbol`) into
  each entry. Transport is pluggable; a console transport ships in the box.

## Package Conventions

Every package must have:

- `package.json` named `@decade/<name>` (the `web` app excepted)
- `tsconfig.json` extending the appropriate `@decade/typescript-config` base
- `src/index.ts` as the entry point (config-only packages excepted)
- at least one colocated `*.test.ts`
- `README.md` with a brief description
- **named exports only** (no default exports, except Next
  pages/layouts/route handlers/config)

Every package should keep files under ~300 lines, use explicit return types on
public functions, avoid `any` without a justifying comment, and import across
boundaries by package name (`.js` specifiers internally; extensionless for
`@decade/ui`).
