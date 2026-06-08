# Architecture Overview

## The problem

A mini stock exchange. Brokers submit orders on behalf of customers; the system
keeps track of them and executes matches when a buyer and seller cross for the
same symbol. An order carries: submitting broker, owner document number, side
(bid/ask), symbol, price, quantity, and validity. Submitting returns an order id
the broker uses to poll status.

## Matching semantics

- **Crossing:** a bid (buyer max) and ask (seller min) cross when `bid ≥ ask`.
- **Execution price:** the seller's (ask) price, even on a gap.
- **Partial fills:** the smaller side fills; the remainder stays on the book.
- **Priority:** best price first; ties broken in chronological (price-time) order
  via a monotonic per-order `sequence`.
- **Market orders (extension):** cross at the best available price and never rest —
  any unfilled remainder is cancelled.

## Module map

```
@decade/types            domain primitives (Order, Trade, Cents, OrderBook)
        ▲
@decade/matching-engine  PURE: matchOrder(), buildOrderBook(), movingAverage()
        ▲
@decade/db               Drizzle schema + pg client; toDomainOrder() bridge
        ▲
@decade/exchange-runtime Inngest functions + persistMatchResult() (transaction)
        ▲
apps/web                 REST API, Clerk auth, dashboard, Inngest/MCP endpoints
```

`@decade/mcp` sits beside the API, exposing it as MCP tools. Those tools call the
same broker-scoped `exchange-service` the REST routes use (no HTTP round-trip),
acting as the broker resolved from the caller's identity — a Clerk **OAuth** token
(the native add-by-URL connector, discovered via the `.well-known/oauth-*` routes)
or a forwarded **API key**. `@decade/auth`, `@decade/ui`, and `@decade/logger` are
cross-cutting.

## The order lifecycle

1. **Submit** — `POST /api/orders` validates the body (`@/lib/validation`) and checks
   buying power; an underfunded limit buy is recorded `rejected` and goes no further.
   Otherwise it inserts an `open` order row, returns `{ orderId, status }`, and emits
   `order/submitted`. The REST route, the terminal server action, and the MCP
   `submit_order` tool share this one service, so all three behave identically.
2. **Match** — the `match-order` Inngest function runs with **per-symbol
   concurrency (`key: symbol, limit: 1`)**. This single-writer-per-symbol
   guarantee is what makes price-time priority and partial fills race-free without
   application locks. It loads the resting book, runs the pure engine, and calls
   `persistMatchResult` to write trades, order updates, and broker balance moves in
   **one transaction**.
3. **Settle/notify** — each execution emits `trade/executed`, fanned out to
   `deliver-webhook` for signed, retried HTTP delivery to broker endpoints.
4. **Expire** — an `expire-orders` cron sweeps past-`expiresAt` orders to `expired`.

## Why the engine is pure

`matchOrder` takes the incoming order plus the resting book and returns proposed
trades and updated order states — no database, no clock, no id generation. The
runtime supplies persistence and timestamps. This keeps the engine deterministic
and exhaustively unit-testable; `packages/matching-engine/src/match.test.ts`
encodes every example from the brief.

## Data model

`brokers` (cash balance), `stocks` (reference symbols), `orders` (with `sequence`
bigserial for priority and `remaining` for partial fills), `trades`,
`webhook_endpoints`, `webhook_deliveries`. Money is integer cents throughout.

## Deployment

The web app deploys to Vercel (`decade.usebleep.com`); Postgres is Neon; Inngest
runs in the cloud. The committed `Dockerfile` + `docker-compose.yml` reproduce the
full stack locally (Postgres + migrate/seed + web + Inngest dev) for review.
