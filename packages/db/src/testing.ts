import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import type { Database } from './client.js'
import { brokers } from './schema/tables.js'
import * as schema from './schema/index.js'
import type { Broker, NewBroker } from './index.js'

// The Drizzle migrations live at packages/db/drizzle, one level up from this
// module — true whether it runs from src/ (Vitest) or dist/ (the built package).
const MIGRATIONS_FOLDER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle')

// Mutable tables truncated on reset. `stocks` is deliberately excluded: it holds
// the seeded reference universe that the data tables' foreign keys depend on.
const DATA_TABLES = 'trades, webhook_deliveries, webhook_endpoints, positions, orders, brokers'

/** An in-process Postgres for tests, plus reset/seed helpers. */
export interface TestDb {
  /**
   * A Drizzle client typed as the app's `Database`. The runtime is pglite, but
   * the query surface is identical, so DB-backed logic (repos, route handlers,
   * `runMatch`, …) can run against it unchanged.
   */
  db: Database
  /** The underlying in-process Postgres, for raw `query`/introspection in tests. */
  client: PGlite
  /** Truncate all data tables back to empty (the seeded reference stocks remain). */
  reset: () => Promise<void>
  /** Insert a broker with sensible defaults and return the persisted row. */
  seedBroker: (overrides?: Partial<NewBroker>) => Promise<Broker>
  /** Shut the database down and free its memory. */
  close: () => Promise<void>
}

/**
 * Boot an in-process (pglite) Postgres, apply the Drizzle migrations under
 * `packages/db/drizzle`, and return a `Database` plus reset/seed helpers.
 *
 * Needs no external Postgres and no `TEST_DATABASE_URL`, so it runs in CI and in
 * the sandcastle container. The migrations include the seed of the reference
 * stock universe, so the returned database is immediately tradeable.
 */
export async function createTestDb(): Promise<TestDb> {
  const client = new PGlite()
  const drizzleDb = drizzle(client, { schema })
  await migrate(drizzleDb, { migrationsFolder: MIGRATIONS_FOLDER })

  // Same query builder, pglite runtime. The cast bridges the driver-specific
  // Drizzle types (pglite vs. node-postgres) that the app's `Database` names.
  const db = drizzleDb as unknown as Database

  let brokerCounter = 0

  return {
    db,
    client,
    async reset() {
      await db.execute(sql.raw(`TRUNCATE ${DATA_TABLES} RESTART IDENTITY CASCADE`))
      brokerCounter = 0
    },
    async seedBroker(overrides: Partial<NewBroker> = {}): Promise<Broker> {
      brokerCounter += 1
      const [row] = await db
        .insert(brokers)
        .values({
          clerkUserId: `user_test_${brokerCounter}`,
          name: `Test Broker ${brokerCounter}`,
          cashBalanceCents: 100_000_000,
          ...overrides,
        })
        .returning()
      return row!
    },
    async close() {
      await client.close()
    },
  }
}
