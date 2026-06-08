import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { and, eq, inArray } from 'drizzle-orm'
import { brokers, orders, stocks, type Broker } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { runMarketMaker, DEFAULT_LADDER } from './run-market-maker.js'

// runMarketMaker against the in-process pglite harness — the body of the
// market-maker job, factored out of the Inngest wrappers so the quote-ladder
// posting and re-quote-via-cancel rules are driven directly against a database.
describe('runMarketMaker (pglite harness)', () => {
  let harness: TestDb
  let mockBroker: Broker

  const NOW = new Date('2026-06-06T12:00:00.000Z')

  beforeEach(async () => {
    if (!harness) harness = await createTestDb()
    await harness.reset()
    mockBroker = await harness.seedBroker({
      name: 'House Liquidity',
      isMock: true,
      cashBalanceCents: 100_000_000,
    })
    await harness.db
      .update(stocks)
      .set({ referencePriceCents: 10_000 })
      .where(eq(stocks.symbol, 'AAPL'))
  })

  afterAll(async () => {
    if (harness) await harness.close()
  })

  async function bookOrders(symbol: string) {
    return harness.db
      .select()
      .from(orders)
      .where(and(eq(orders.symbol, symbol), inArray(orders.status, ['open', 'partially_filled'])))
  }

  it('posts resting two-sided mock orders onto a thin/empty book', async () => {
    const result = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)

    const resting = await bookOrders('AAPL')
    expect(resting.length).toBe(DEFAULT_LADDER.depth * 2)
    expect(result.submittedOrderIds.length).toBe(DEFAULT_LADDER.depth * 2)

    // Every posted order belongs to a mock broker and rests open.
    for (const row of resting) {
      expect(row.brokerId).toBe(mockBroker.id)
      expect(row.status).toBe('open')
    }
    const sides = new Set(resting.map((r) => r.side))
    expect(sides).toEqual(new Set(['bid', 'ask']))
  })

  it('quotes around the symbol reference price (bids below, asks above)', async () => {
    await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)
    const resting = await bookOrders('AAPL')

    const askPrices = resting.filter((r) => r.side === 'ask').map((r) => r.limitPriceCents!)
    const bidPrices = resting.filter((r) => r.side === 'bid').map((r) => r.limitPriceCents!)
    expect(Math.min(...askPrices)).toBeGreaterThan(10_000)
    expect(Math.max(...bidPrices)).toBeLessThan(10_000)
  })

  it('re-quoting cancels the prior mock quotes through the shared cancel path', async () => {
    const first = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)
    const second = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)

    // The prior quotes are cancelled, not left to accumulate.
    expect(second.cancelledOrderIds.sort()).toEqual([...first.submittedOrderIds].sort())
    const cancelled = await harness.db
      .select()
      .from(orders)
      .where(inArray(orders.id, first.submittedOrderIds))
    expect(cancelled.every((r) => r.status === 'cancelled')).toBe(true)

    // Only the fresh ladder rests; the book did not grow.
    const resting = await bookOrders('AAPL')
    expect(resting.length).toBe(DEFAULT_LADDER.depth * 2)
  })

  it('is a no-op when there are no mock brokers seeded', async () => {
    await harness.db.update(brokers).set({ isMock: false }).where(eq(brokers.id, mockBroker.id))

    const result = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)

    expect(result.submittedOrderIds).toHaveLength(0)
    expect(await bookOrders('AAPL')).toHaveLength(0)
  })

  it('is a no-op when the symbol has no reference price', async () => {
    await harness.db
      .update(stocks)
      .set({ referencePriceCents: null })
      .where(eq(stocks.symbol, 'AAPL'))

    const result = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)

    expect(result.submittedOrderIds).toHaveLength(0)
    expect(await bookOrders('AAPL')).toHaveLength(0)
  })

  it('flags no crossing quotes for a fresh ladder on a clean book', async () => {
    const result = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)
    expect(result.crossingOrderIds).toHaveLength(0)
  })

  it('flags a fresh quote that crosses a resting order', async () => {
    // A user's resting bid sits well above where the ladder will post its asks.
    const user = await harness.seedBroker({ name: 'User', cashBalanceCents: 100_000_000 })
    await harness.db.insert(orders).values({
      brokerId: user.id,
      ownerDocument: 'doc',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPriceCents: 10_100,
      quantity: 10,
      remaining: 10,
      status: 'open',
    })

    const result = await runMarketMaker(harness.db, 'AAPL', DEFAULT_LADDER, NOW)

    expect(result.crossingOrderIds.length).toBeGreaterThan(0)
    const flagged = await harness.db
      .select()
      .from(orders)
      .where(inArray(orders.id, result.crossingOrderIds))
    // The flagged quotes are the asks that cross the high resting bid.
    expect(flagged.every((row) => row.side === 'ask')).toBe(true)
  })
})
