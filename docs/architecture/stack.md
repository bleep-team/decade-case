# Stack

## Technology Choices

| Layer                  | Choice                                | Purpose                                                                                       |
| ---------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Monorepo tooling**   | pnpm + Turborepo                      | Workspace package management; cached `build → typecheck → test → lint` task graph             |
| **Frontend / Backend** | Next.js (App Router)                  | Landing page, Clerk auth, broker dashboard, and the REST / Inngest / MCP route handlers       |
| **API**                | Next.js Route Handlers                | `/api/orders`, `/api/trades`, `/api/stocks`, `/api/brokers`, `/api/webhooks`, `/api/health`   |
| **UI components**      | shadcn/ui + Tailwind v4               | Shared design system in `@decade/ui`; CSS-first `@theme` tokens, single dark theme            |
| **Typography**         | Inter                                 | One typeface (sans); numeric data uses the Tailwind `font-mono` stack                         |
| **Database**           | Postgres (Neon in prod) + Drizzle ORM | Relational store for brokers, stocks, orders, trades, positions, webhooks                     |
| **DB driver**          | `pg` (node-postgres)                  | Standard wire protocol; same code path locally and on Neon, with interactive transactions     |
| **Auth**               | Clerk (social login)                  | Google / GitHub sign-in; `clerkMiddleware` guards `/app(.*)`; auto-provisions a funded broker |
| **Jobs / queues**      | Inngest                               | Event-driven matching, expiry cron, webhook fan-out, market-maker quoting                     |
| **Realtime**           | Inngest Realtime                      | Per-broker channel push so the terminal updates without polling                               |
| **Agent / LLM access** | MCP server (`@decade/mcp`)            | Exposes the exchange as MCP tools; Clerk OAuth 2.1 primary, forwarded API key fallback        |
| **Observability**      | `@decade/logger`                      | Structured JSON logging with bound context (`requestId`, `brokerId`, `orderId`, `symbol`)     |
| **Build tool**         | tsup (ESM + DTS)                      | Builds every internal library to ESM with type declarations                                   |
| **Test runner**        | Vitest                                | Colocated `*.test.ts`; in-process Postgres (pglite) for DB-backed tests                       |
| **Deployment**         | Vercel                                | Hosts the Next.js app and API; Postgres is Neon, Inngest runs in the cloud                    |
| **CI/CD**              | GitHub Actions + Vercel               | Affected-only PR checks; migrations applied before the app starts                             |
| **Source control**     | GitHub                                | Code hosting, issues, pull requests                                                           |

A committed `Dockerfile` + `docker-compose.yml` reproduce the full stack locally
(Postgres + migrate/seed + web + Inngest dev) for review.

## Why These Choices

Each subsection summarizes the relevant Architecture Decision Record. See the
linked ADR for the full context and consequences.

### Monorepo: pnpm + Turborepo ([ADR 0001](../adr/0001-monorepo-pnpm-turborepo.md))

The system has a clean separation between pure domain logic (matching), data
access, the jobs runtime, the MCP surface, and the web app. Each is an
independent package with its own tests and boundaries, sharing config through
`@decade/typescript-config` and `@decade/eslint-config`. `turbo.json` defines the
pipeline with `^build` dependencies so internal packages build in order, and
`--filter='...[origin/main]'` drives affected-only checks in CI and the pre-push
hook.

### Postgres + Drizzle via `pg` ([ADR 0002](../adr/0002-postgres-drizzle.md))

A match reads the resting book and writes trades, order updates, and balance
changes that must be **atomic**, so the data path needs interactive transactions.
The **`pg` (node-postgres)** driver was chosen over the Neon serverless
(WebSocket/HTTP) driver: the serverless driver cannot talk to a vanilla Postgres
container (breaking the reproducible Docker stack) and its HTTP mode does not
support interactive transactions. `pg` speaks the standard Postgres wire
protocol, so the **same code path** runs against local Postgres and Neon, and
`persistMatchResult` can wrap every write for an execution in one
`db.transaction`. Money is stored as **integer cents**; a monotonic `bigserial`
`sequence` column on `orders` is the price-time priority tiebreaker.

### Clerk for auth ([ADR 0003](../adr/0003-clerk-auth.md))

Clerk gives low-friction social login (Google, GitHub) and a clean App Router
integration. `clerkMiddleware` protects `/app(.*)`; the landing page and the
Inngest endpoint stay public. The broker is always identified by the caller's
**verified identity**, never by a `brokerId` in the request body — either the
Clerk session (auto-provisioning a funded broker on first login) or a forwarded
API key. Only a key's SHA-256 hash is ever stored.

### Inngest for jobs and per-symbol matching ([ADR 0004](../adr/0004-inngest-jobs.md))

Matching must happen as soon as crossing orders appear, respect chronological
order, and never double-execute under concurrent submissions. Inngest's keyed
concurrency is a near-perfect fit: `match-order` consumes `order/submitted` with
**`concurrency: { key: symbol, limit: 1 }`**, so at most one run touches a given
symbol's book at a time. This single-writer-per-symbol guarantee makes
price-time priority and partial fills race-free **without application-level
locks**, while different symbols still match in parallel. The same runtime hosts
the `expire-orders` cron, the `deliver-webhook` fan-out, and the market-maker
quoting jobs.

### A pure matching engine ([ADR 0005](../adr/0005-matching-engine.md))

Matching is the core of the system and the part most worth getting provably
right. `@decade/matching-engine` is implemented as a **pure** package:
`matchOrder(incoming, restingBook)` returns proposed trades and updated order
states with **no database, no clock, and no id generation** — the caller excludes
expired orders and assigns trade ids/timestamps at persistence time. This keeps
the engine deterministic and exhaustively unit-testable; `match.test.ts` encodes
every example from the brief. Side effects (persistence, timestamps) and the
money leg (the buying-power check) live in the runtime boundary, not the engine.

### shadcn/ui in the shared UI package ([ADR 0006](../adr/0006-shadcn-shared-ui.md))

shadcn/ui copies component source into the repo rather than installing a
black-box library, giving full control over markup, styling, and brand. It is
initialized **inside `packages/ui/`** (the upstream shadcn monorepo layout), so
one source of truth feeds every consumer. Design tokens live CSS-first in
`src/styles/globals.css` via Tailwind v4 `@theme`: a raw neutral brand layer, a
single warm orange `--brand` accent, market-data tokens, and the semantic shadcn
aliases. The brand runs as a **single dark theme — no light mode** — and a single
typeface, Inter.

### MCP authenticated by Clerk OAuth ([ADR 0007](../adr/0007-mcp-clerk-oauth.md))

The exchange exposes its tools to LLM clients through an MCP server at
`/api/mcp` (Streamable HTTP). It is authenticated with **Clerk OAuth 2.1 as the
primary path and a forwarded API key as a fallback**, using Clerk's first-party
MCP support (`@clerk/mcp-tools`, `withMcpAuth`) rather than a hand-rolled OAuth
server. A bearer is verified first as a Clerk OAuth token; failing that, it is
resolved as a broker API key by hash. The discovery metadata the native
connector reads is published at the `.well-known/oauth-*` routes. The acting
broker always comes from the verified identity, never a tool argument, and both
paths converge on the shared broker-scoped `exchange-service` the REST routes
use.
