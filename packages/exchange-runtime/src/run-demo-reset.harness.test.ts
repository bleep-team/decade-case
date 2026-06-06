import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { brokers, orders, positions, type NewOrder } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { eq } from 'drizzle-orm'
import { runDemoReset } from './run-demo-reset.js'

const STARTING = 100_000_000

let harness: TestDb

async function insertOrder(values: Partial<NewOrder> & { brokerId: string }): Promise<string> {
  const [row] = await harness.db
    .insert(orders)
    .values({
      ownerDocument: 'doc',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 10,
      remaining: 10,
      status: 'open',
      ...values,
    })
    .returning({ id: orders.id })
  return row!.id
}

describe('runDemoReset', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it('cancels the broker resting orders and restores the starting balance', async () => {
    const broker = await harness.seedBroker({ cashBalanceCents: 37 })
    const openId = await insertOrder({ brokerId: broker.id, status: 'open' })
    const partialId = await insertOrder({ brokerId: broker.id, status: 'partially_filled' })

    const result = await runDemoReset(harness.db, broker.id, STARTING)

    expect(result.cancelledOrderIds).toEqual(expect.arrayContaining([openId, partialId]))
    expect(result.cancelledOrderIds).toHaveLength(2)
    expect(result.cashBalanceCents).toBe(STARTING)

    const rows = await harness.db.select().from(orders).where(eq(orders.brokerId, broker.id))
    for (const row of rows) {
      expect(row.status).toBe('cancelled')
    }

    const [refreshed] = await harness.db.select().from(brokers).where(eq(brokers.id, broker.id))
    expect(refreshed!.cashBalanceCents).toBe(STARTING)
  })

  it('leaves already-terminal orders untouched and clears positions', async () => {
    const broker = await harness.seedBroker({ cashBalanceCents: 5 })
    const filledId = await insertOrder({ brokerId: broker.id, status: 'filled', remaining: 0 })
    await harness.db
      .insert(positions)
      .values({ brokerId: broker.id, symbol: 'AAPL', quantity: 12 })

    const result = await runDemoReset(harness.db, broker.id, STARTING)

    expect(result.cancelledOrderIds).toEqual([])

    const [filled] = await harness.db.select().from(orders).where(eq(orders.id, filledId))
    expect(filled!.status).toBe('filled')

    const held = await harness.db.select().from(positions).where(eq(positions.brokerId, broker.id))
    expect(held).toEqual([])
  })

  it('does not touch another broker orders or balance', async () => {
    const me = await harness.seedBroker({ cashBalanceCents: 1 })
    const other = await harness.seedBroker({ cashBalanceCents: 999 })
    const mine = await insertOrder({ brokerId: me.id, status: 'open' })
    const theirs = await insertOrder({ brokerId: other.id, status: 'open' })

    await runDemoReset(harness.db, me.id, STARTING)

    const [myOrder] = await harness.db.select().from(orders).where(eq(orders.id, mine))
    expect(myOrder!.status).toBe('cancelled')
    const [theirOrder] = await harness.db.select().from(orders).where(eq(orders.id, theirs))
    expect(theirOrder!.status).toBe('open')
    const [theirBroker] = await harness.db.select().from(brokers).where(eq(brokers.id, other.id))
    expect(theirBroker!.cashBalanceCents).toBe(999)
  })
})
