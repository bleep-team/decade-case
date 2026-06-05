# Decade Exchange — Agent Instructions

## Project Overview

A mini stock exchange. Brokers submit bid (buy) / ask (sell) orders on behalf of
customers; a pure matching engine pairs them per symbol. Crossing rule: `bid ≥
ask`, execute at the **seller's (ask) price**, with **partial fills** and
**price-time (chronological) priority**. Money is integer **cents** everywhere.

Packages live in `packages/<name>/`, published as `@decade/<name>`.

## Stack

pnpm + Turborepo · Next.js (App Router) on Vercel · Postgres (Neon) + Drizzle
(`pg` driver) · Clerk auth · Inngest jobs · MCP server over the REST API.

## Packages

| Package                     | Description                                             |
| --------------------------- | ------------------------------------------------------- |
| `@decade/typescript-config` | Shared tsconfig bases                                   |
| `@decade/eslint-config`     | Shared ESLint flat config                               |
| `@decade/types`             | Domain primitives (Order, Trade, Cents, OrderBook)      |
| `@decade/logger`            | Structured logging                                      |
| `@decade/matching-engine`   | Pure price-time matching, partial fills, book, price    |
| `@decade/db`                | Drizzle schema, migrations, `pg` client                 |
| `@decade/auth`              | Clerk helpers + broker identity                         |
| `@decade/ui`                | Tailwind design-system components                       |
| `@decade/exchange-runtime`  | Inngest jobs (match, expiry, webhooks) + persistence    |
| `@decade/mcp`               | MCP server exposing the exchange API as tools           |
| `web`                       | Next.js app: landing, auth, dashboard, REST/Inngest/MCP |

## Conventions

- Named exports; explicit return types on public functions; no `any` without
  justification; files under ~300 lines.
- Cross-package imports use package names, not relative paths.
- Internal libs use `.js` import specifiers (tsup/ESM). `@decade/ui` (consumed via
  `transpilePackages`, not built) uses extensionless imports.
- Build: tsup (ESM + DTS). Tests: Vitest, colocated `*.test.ts`. Every package has tests.

## Creating a new package

1. `packages/<name>/` with `package.json` (`@decade/<name>`).
2. `tsconfig.json` extends `@decade/typescript-config/library.json`.
3. `README.md`, `src/index.ts` (named exports), `src/index.test.ts`.
4. tsup build, Vitest test. Add the dir name to `commitlint.config.js` `scope-enum`.

## Git

Conventional Commits (commitlint-enforced). Branch `<author>/<description>`. Never
commit secrets or `.env`. Run lint/typecheck/test before pushing.

## Skills

`.agents/skills/` (shared) — read `SKILL.md` from disk before following. Relevant:
`tdd`, `turborepo`, `monorepo-management`, `neon-postgres`, `next-best-practices`.
