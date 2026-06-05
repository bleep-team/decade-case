# Decade Exchange

A mini stock exchange. Brokers submit **bid** (buy) and **ask** (sell) orders on
behalf of their customers; a matching engine keeps a live book per symbol and
executes trades as soon as a buyer and seller cross.

**Matching rules**

- A bid is the _maximum_ a buyer will pay; an ask is the _minimum_ a seller will
  accept. They cross when `bid ≥ ask`.
- On a price gap, execution happens at the **seller's (ask) price**.
- Orders **partially fill**; the remainder stays on the book.
- Ties at the same price resolve in **chronological order** (price-time priority).

## Stack

| Layer            | Choice                                              |
| ---------------- | --------------------------------------------------- |
| Monorepo         | pnpm + Turborepo                                    |
| Frontend/Backend | Next.js (App Router), deployed on Vercel            |
| UI               | Tailwind CSS + a small shadcn-style design system   |
| Database         | Postgres (Neon in prod) + Drizzle ORM (`pg` driver) |
| Auth             | Clerk (Google/GitHub social login)                  |
| Jobs / queues    | Inngest                                             |
| Agent access     | MCP server over the REST API                        |
| CI/CD            | GitHub Actions + Vercel                             |

Production: **https://decade.usebleep.com**

## Repo structure

```
apps/
  web/                      # Next.js — landing, Clerk auth, broker dashboard,
                            #   REST API (/api/orders, /api/stocks, /api/brokers),
                            #   Inngest (/api/inngest), MCP (/api/mcp)
packages/
  typescript-config/        # Shared tsconfig bases
  eslint-config/            # Shared ESLint flat config
  types/                    # Domain primitives (Order, Trade, Cents, OrderBook)
  logger/                   # Structured logging
  matching-engine/          # Pure price-time matching, partial fills, book, price
  db/                       # Drizzle schema, migrations, pg-backed client
  auth/                     # Clerk helpers + broker identity
  ui/                       # Tailwind design-system components
  exchange-runtime/         # Inngest jobs (match, expiry, webhooks) + persistence
  mcp/                      # MCP server exposing the exchange API as tools

docs/                       # Architecture, ADRs, runbooks — see docs/README.md
```

## Getting started

### Prerequisites

- Node.js 20+, pnpm 10+ (`corepack enable`)
- Docker (for the one-command local stack)

### Run the whole stack with Docker (reproducible)

```bash
docker compose up --build
# app:          http://localhost:3000
# Inngest dev:  http://localhost:8288
```

This brings up Postgres, runs migrations + seeds reference stocks, starts the web
app, and starts the Inngest dev server. Provide real Clerk keys for working auth:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_... CLERK_SECRET_KEY=sk_... docker compose up --build
```

### Run locally with pnpm

```bash
pnpm install
cp apps/web/.env.example apps/web/.env       # fill in Clerk + DATABASE_URL
cp packages/db/.env.example packages/db/.env
pnpm --filter @decade/db db:migrate          # apply schema
pnpm --filter @decade/db db:seed             # seed reference stocks
pnpm dev                                      # web on :3000
pnpm dev:inngest                              # Inngest dev server (separate shell)
```

## Scripts

| Script           | Description                      |
| ---------------- | -------------------------------- |
| `pnpm build`     | Build all packages via Turborepo |
| `pnpm dev`       | Start all packages in dev mode   |
| `pnpm test`      | Run all tests                    |
| `pnpm lint`      | Lint all packages                |
| `pnpm typecheck` | Type-check all packages          |
| `pnpm format`    | Format with Prettier             |

## API (v1)

| Method | Path                        | Purpose                                |
| ------ | --------------------------- | -------------------------------------- |
| `POST` | `/api/orders`               | Submit a bid/ask order → `{ orderId }` |
| `GET`  | `/api/orders/:id`           | Order status                           |
| `GET`  | `/api/stocks/:symbol/book`  | Top-of-book bids/asks (`?depth=10`)    |
| `GET`  | `/api/stocks/:symbol/price` | Current price (moving average)         |
| `GET`  | `/api/brokers/:id/balance`  | Broker cash balance                    |
| `GET`  | `/api/health`               | Liveness + DB readiness                |
| `POST` | `/api/inngest`              | Inngest function endpoint              |
| `GET`  | `/api/mcp`                  | MCP server surface                     |

## Documentation

See [`docs/`](docs/README.md): the [architecture overview](docs/architecture/overview.md),
[Architecture Decision Records](docs/adr/), and domain terms in
[`UBIQUITOUS_LANGUAGE.md`](UBIQUITOUS_LANGUAGE.md).

## Coding agents

Configured for Claude Code (`CLAUDE.md`, `.claude/`), Codex (`AGENTS.md`,
`.agents/skills/`), and Cursor (`.cursor/rules/`). Shared skills are pinned in
`skills-lock.json`.
