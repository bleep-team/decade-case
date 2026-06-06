import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
import { brokers } from './schema/tables.js'
import { createTestDb, type TestDb } from './testing.js'

// This whole suite runs with NO external Postgres and NO TEST_DATABASE_URL — the
// database lives in-process (pglite). The migrations under ./drizzle are applied
// on boot, so every table/column the app queries is present.
describe('createTestDb (in-process pglite harness)', () => {
  let harness: TestDb

  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it('boots without TEST_DATABASE_URL and inserts and reads back a broker', async () => {
    expect(process.env['TEST_DATABASE_URL']).toBeUndefined()

    await harness.db
      .insert(brokers)
      .values({ clerkUserId: 'user_smoke', name: 'Smoke Broker', cashBalanceCents: 100 })

    const rows = await harness.db.select().from(brokers)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ clerkUserId: 'user_smoke', cashBalanceCents: 100 })
  })

  it('applies the PRD #5 schema: positions table, broker key/mock, stock reference price, rejected status', async () => {
    // positions table exists and accepts a signed (short) quantity.
    const cols = await harness.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'positions'",
    )
    expect(cols.rows.map((r) => r.column_name)).toEqual(
      expect.arrayContaining(['broker_id', 'symbol', 'quantity']),
    )

    // brokers gained api_key_hash + is_mock.
    const brokerCols = await harness.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'brokers'",
    )
    expect(brokerCols.rows.map((r) => r.column_name)).toEqual(
      expect.arrayContaining(['api_key_hash', 'is_mock']),
    )

    // stocks gained reference_price_cents.
    const stockCols = await harness.client.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'stocks'",
    )
    expect(stockCols.rows.map((r) => r.column_name)).toContain('reference_price_cents')

    // order_status enum gained 'rejected'.
    const labels = await harness.db.execute<{ enumlabel: string }>(
      sql`select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'order_status'`,
    )
    expect(labels.rows.map((r) => r.enumlabel)).toContain('rejected')
  })

  it('seeds the reference stock universe so foreign keys resolve', async () => {
    const seeded = await harness.client.query<{ symbol: string }>('select symbol from stocks')
    expect(seeded.rows.map((r) => r.symbol)).toEqual(
      expect.arrayContaining(['AAPL', 'TSLA', 'AMZN', 'GOOGL', 'MSFT']),
    )
  })

  it('seedBroker inserts a broker and returns its row', async () => {
    const broker = await harness.seedBroker({ name: 'House' })
    expect(broker.id).toBeTruthy()
    expect(broker.name).toBe('House')
  })

  // The next two cases prove reset isolation: each inserts its own broker and
  // sees ONLY its own, because beforeEach reinitializes state between them.
  it('reset isolation — case A inserts one broker and sees exactly one', async () => {
    await harness.seedBroker({ clerkUserId: 'user_a', name: 'A' })
    const rows = await harness.db.select().from(brokers)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('A')
  })

  it('reset isolation — case B does not see case A’s broker', async () => {
    await harness.seedBroker({ clerkUserId: 'user_b', name: 'B' })
    const rows = await harness.db.select().from(brokers)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('B')
  })
})
