# @decade/db

Drizzle ORM schema, migrations, and a `pg`-backed client for Postgres (Neon in
prod, plain Postgres locally).

- `createDbClient(connectionString)` — a node-postgres Drizzle client with full
  interactive transaction support.
- Tables: `brokers`, `stocks`, `orders`, `trades`, `webhookEndpoints`,
  `webhookDeliveries`. Money columns are integer cents; `orders.sequence` is a
  `bigserial` priority tiebreaker.
- `toDomainOrder(row)` bridges a row to the `@decade/types` `Order` shape.

```bash
pnpm --filter @decade/db db:generate   # generate a migration from the schema
pnpm --filter @decade/db db:migrate    # apply migrations
pnpm --filter @decade/db db:seed       # seed reference stocks
```
