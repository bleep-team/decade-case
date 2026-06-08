# Decade Exchange — Monorepo

## Project Overview

A mini stock exchange. Brokers submit **bid** (buy) and **ask** (sell) orders on
behalf of their customers; a **matching engine** pairs buyers and sellers per
symbol and executes trades. This is an engineering-case implementation.

Matching rules (the heart of the system):

- A bid is the **maximum** a buyer will pay; an ask is the **minimum** a seller
  will accept. They cross when `bid ≥ ask`.
- On a price gap, **execution happens at the seller's (ask) price**.
- Orders **partially fill**; remaining quantity stays on the book.
- Ties at the same price resolve in **chronological order** (price-time priority).

Each package lives in `packages/<name>/` and is published as `@decade/<name>`.

## Stack

| Layer            | Choice                                             |
| ---------------- | -------------------------------------------------- |
| Monorepo         | pnpm + Turborepo                                   |
| Frontend/Backend | Next.js (App Router) on Vercel                     |
| UI               | Tailwind CSS + shadcn/ui design system             |
| Database         | Postgres (Neon in prod) + Drizzle ORM, `pg` driver |
| Auth             | Clerk (social login)                               |
| Jobs / queues    | Inngest                                            |
| Agent/LLM access | MCP server over the REST API                       |
| CI/CD            | GitHub Actions + Vercel                            |

## Packages

| Package                     | Description                                                                  |
| --------------------------- | ---------------------------------------------------------------------------- |
| `@decade/typescript-config` | Shared tsconfig bases (base, react, library)                                 |
| `@decade/eslint-config`     | Shared ESLint flat config                                                    |
| `@decade/types`             | Shared domain primitives (Order, Trade, Cents, OrderBook…)                   |
| `@decade/logger`            | Structured JSON logging                                                      |
| `@decade/matching-engine`   | **Pure** price-time matching, partial fills, order book, price calc          |
| `@decade/db`                | Drizzle schema, migrations, `pg`-backed client                               |
| `@decade/auth`              | Clerk helpers + broker identity                                              |
| `@decade/ui`                | shadcn/ui design system (Tailwind v4, dark theme)                            |
| `@decade/exchange-runtime`  | Inngest jobs: matching, expiry sweep, webhook delivery + persistence         |
| `@decade/mcp`               | MCP server exposing the exchange API as tools                                |
| `web` (apps/web)            | Next.js: landing, Clerk auth, broker dashboard, REST + Inngest/MCP endpoints |

## Architecture: the order lifecycle

1. `POST /api/orders` validates the body and checks buying power: an underfunded
   limit buy is inserted `rejected` and stops here; otherwise it inserts an `open`
   order row, returns its id, and emits an `order/submitted` Inngest event. The
   REST route, the terminal server action, and the MCP `submit_order` tool all go
   through the one shared `exchange-service`, so the three surfaces behave alike.
2. The `match-order` Inngest function runs with **per-symbol concurrency
   (`key: symbol, limit: 1`)** — a single writer per symbol — loads the resting
   book, runs `@decade/matching-engine`, and persists trades + order updates +
   broker balance moves in **one transaction** (`persistMatchResult`).
3. Each execution emits `trade/executed`, which fans out to `deliver-webhook`
   (signed, retried HTTP delivery).
4. An `expire-orders` cron sweeps past-`expiresAt` orders to `expired`.

The matching engine is pure and clock-free: the caller excludes expired orders
and assigns trade ids/timestamps. This keeps it exhaustively unit-testable
(`packages/matching-engine/src/match.test.ts` encodes every example in the brief).

## Conventions

- Package names `@decade/<name>`; cross-package imports use package names, never
  relative paths across boundaries.
- Named exports; explicit return types on public functions. No `any` without a
  justification comment. Files under ~300 lines.
- Money is **integer cents** everywhere (`Cents`) — never floats.
- Build tool: tsup (ESM + DTS). Test runner: Vitest, colocated `*.test.ts`.
- Internal libraries use `.js` import specifiers (ESM/tsup). The non-built
  `@decade/ui` package (consumed via `transpilePackages`) uses extensionless imports.

## Commands

| Command                                | What it does                                                      |
| -------------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                             | Run all packages/apps in dev                                      |
| `pnpm dev:inngest`                     | Local Inngest dev server                                          |
| `pnpm build`                           | Build everything via Turborepo                                    |
| `pnpm test`                            | Run all tests                                                     |
| `pnpm lint`                            | Lint                                                              |
| `pnpm typecheck`                       | Typecheck                                                         |
| `pnpm --filter @decade/db db:generate` | Generate a Drizzle migration                                      |
| `pnpm --filter @decade/db db:migrate`  | Apply migrations                                                  |
| `docker compose up --build`            | Full reproducible stack (Postgres + migrate/seed + web + Inngest) |

## Git Hooks (Husky v9)

| Hook         | Tool            | Action                                                      |
| ------------ | --------------- | ----------------------------------------------------------- |
| `pre-commit` | lint-staged     | ESLint --fix + Prettier on staged files                     |
| `commit-msg` | commitlint      | Conventional Commits (see scopes in `commitlint.config.js`) |
| `pre-push`   | turbo typecheck | Typechecks packages changed since main                      |

When adding a package, add its directory name to `scope-enum` in `commitlint.config.js`.

## Skills

Installed skills live in `.claude/skills/` (symlinks into `.agents/skills/`).
Read a skill's `SKILL.md` from disk before following it. Most relevant here:
`/tdd` (matching engine), `/turborepo` + `/monorepo-management` (packages),
`/neon-postgres` (db), `/next-best-practices` + `/shadcn` (web), `/gh-cli`, `/open-pr`.

## MCP Servers (dev tooling)

`.mcp.json` configures **context7** (library docs) and **playwright** (browser
automation). These are distinct from the product's own MCP server (`@decade/mcp`
plus the `/api/mcp` route), which exposes the exchange to LLM clients.
