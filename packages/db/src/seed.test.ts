import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { createTestDb, type TestDb } from './testing.js'
import { brokers, stocks } from './schema/tables.js'
import { MOCK_BROKERS, SEED_STOCKS, seedMarketData } from './seed.js'

// The seed routine lives in code (not a migration) so it can be unit-tested
// against the in-process pglite harness: after seeding, the house brokers and
// reference prices the market-maker needs are present.
describe('seedMarketData (pglite harness)', () => {
  let harness: TestDb

  beforeEach(async () => {
    if (!harness) harness = await createTestDb()
    await harness.reset()
  })

  afterAll(async () => {
    if (harness) await harness.close()
  })

  it('creates is_mock house brokers with ample cash', async () => {
    await seedMarketData(harness.db)

    const mock = await harness.db.select().from(brokers).where(eq(brokers.isMock, true))
    expect(mock).toHaveLength(MOCK_BROKERS.length)
    for (const broker of mock) {
      expect(broker.isMock).toBe(true)
      expect(broker.cashBalanceCents).toBeGreaterThan(0)
    }
  })

  it('sets a reference price for every seeded symbol', async () => {
    await seedMarketData(harness.db)

    for (const seed of SEED_STOCKS) {
      const [row] = await harness.db.select().from(stocks).where(eq(stocks.symbol, seed.symbol))
      expect(row?.referencePriceCents).toBe(seed.referencePriceCents)
    }
  })

  it('is idempotent: re-running does not duplicate brokers', async () => {
    await seedMarketData(harness.db)
    await seedMarketData(harness.db)

    const mock = await harness.db.select().from(brokers).where(eq(brokers.isMock, true))
    expect(mock).toHaveLength(MOCK_BROKERS.length)
  })
})
