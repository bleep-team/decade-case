# @decade/db

Drizzle ORM schema, migrations, and a `pg`-backed client for Postgres (Neon in
prod, plain Postgres locally).

- `createDbClient(connectionString)` — a node-postgres Drizzle client with full
  interactive transaction support.
- Tables: `brokers`, `stocks`, `orders`, `trades`, `webhookEndpoints`,
  `webhookDeliveries`. Money columns are integer cents; `orders.sequence` is a
  `bigserial` priority tiebreaker.
- `toDomainOrder(row)` bridges a row to the `@decade/types` `Order` shape.
- `positions` (signed, per `(brokerId, symbol)`) holds the share leg of settlement.

```bash
pnpm --filter @decade/db db:generate   # generate a migration from the schema
pnpm --filter @decade/db db:migrate    # apply migrations
pnpm --filter @decade/db db:seed       # seed reference stocks
```

## Test harness (`@decade/db/testing`)

`createTestDb()` boots an **in-process** Postgres ([pglite](https://github.com/electric-sql/pglite),
no external server), applies the migrations under `drizzle/`, and returns a
`Database` (same query surface as `createDbClient`) plus helpers. It needs no
`TEST_DATABASE_URL`, so DB-backed logic is testable in CI and the sandcastle
container, which have no Postgres.

```ts
import { createTestDb } from '@decade/db/testing'

const t = await createTestDb()
await t.seedBroker({ name: 'House' }) // insert with defaults, returns the row
// ... t.db is a Drizzle client; query it like the app does ...
await t.reset() // truncate data tables between tests (seeded stocks remain)
await t.close() // free the in-process database
```
