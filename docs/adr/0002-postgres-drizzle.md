# 0002 — Postgres + Drizzle via node-postgres

**Status:** Accepted

## Context

Matching must be correct under concurrency: a match reads the resting book and
writes trades, order updates, and balance changes that must be **atomic**. That
needs interactive transactions (and the option of `SELECT … FOR UPDATE`). The app
runs on Vercel with Neon Postgres in production, but reviewers must also run it
locally against a plain Postgres container.

## Decision

Use **Postgres + Drizzle ORM** with the **`pg` (node-postgres)** driver.

The Neon serverless (WebSocket/HTTP) driver was considered but rejected for the
data path: it cannot talk to a vanilla Postgres container, which breaks the
reproducible Docker environment, and its HTTP mode does not support interactive
transactions. `pg` speaks the standard Postgres wire protocol, so the **same code
path** runs against local Postgres and Neon, with full transaction support.

Money is stored as **integer cents** (`bigint`/`integer`), never floating point.
A monotonic `bigserial` `sequence` column on `orders` provides the price-time
priority tiebreaker.

## Consequences

- `persistMatchResult` wraps all writes for an execution in one `db.transaction`.
- Local dev and prod differ only by connection string.
- Schema changes flow through Drizzle migrations (`db:generate` → `db:migrate`),
  applied in CI/compose before the app starts.
