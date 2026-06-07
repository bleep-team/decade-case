import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { orders, type Broker, type NewOrder } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { availableBuyingPowerCents, hasBuyingPowerFor } from './buying-power.js'

// Derived buying-power check against the in-process pglite harness. A broker is
// funded with $1,000.00 (100_000 cents) so the arithmetic stays obvious.
describe('buying power (pglite harness)', () => {
  let harness: TestDb
  let broker: Broker

  beforeEach(async () => {
    if (!harness) harness = await createTestDb()
    await harness.reset()
    broker = await harness.seedBroker({ name: 'Broker', cashBalanceCents: 100_000 })
  })

  afterAll(async () => {
    if (harness) await harness.close()
  })

  async function restingBid(limitPriceCents: number, remaining: number): Promise<void> {
    const order: NewOrder = {
      brokerId: broker.id,
      ownerDocument: 'doc',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPriceCents,
      quantity: remaining,
      remaining,
      status: 'open',
    }
    await harness.db.insert(orders).values(order)
  }

  it('reports available power as cash minus committed resting bids', async () => {
    await restingBid(1000, 10) // commits 10_000
    expect(await availableBuyingPowerCents(harness.db, broker.id, broker.cashBalanceCents)).toBe(
      90_000,
    )
  })

  it('allows a limit buy within available power', async () => {
    const ok = await hasBuyingPowerFor(harness.db, broker, {
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 50, // 50_000 <= 100_000
    })
    expect(ok).toBe(true)
  })

  it('rejects a limit buy that exceeds available power', async () => {
    const ok = await hasBuyingPowerFor(harness.db, broker, {
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 200, // 200_000 > 100_000
    })
    expect(ok).toBe(false)
  })

  it('counts cumulative commitment across multiple resting bids', async () => {
    await restingBid(1000, 60) // commits 60_000 -> 40_000 free
    const ok = await hasBuyingPowerFor(harness.db, broker, {
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 50, // 50_000 > 40_000
    })
    expect(ok).toBe(false)
  })

  it('does not gate sells or market buys', async () => {
    const sell = await hasBuyingPowerFor(harness.db, broker, {
      side: 'ask',
      type: 'limit',
      limitPriceCents: 999_999,
      quantity: 999,
    })
    const marketBuy = await hasBuyingPowerFor(harness.db, broker, {
      side: 'bid',
      type: 'market',
      limitPriceCents: null,
      quantity: 999,
    })
    expect(sell).toBe(true)
    expect(marketBuy).toBe(true)
  })
})
