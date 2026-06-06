import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { orders, type Broker, type NewOrder } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { runCancel } from './run-cancel.js'

// runCancel against the in-process pglite harness — no external Postgres. It is
// the body of the cancel job, factored out of the Inngest wrapper so the cancel
// rules are driven directly against a database.
describe('runCancel (pglite harness)', () => {
  let harness: TestDb
  let broker: Broker

  const NOW = new Date('2026-06-06T12:00:00.000Z')

  beforeEach(async () => {
    if (!harness) harness = await createTestDb()
    await harness.reset()
    broker = await harness.seedBroker({ name: 'Broker', cashBalanceCents: 100_000_000 })
  })

  afterAll(async () => {
    if (harness) await harness.close()
  })

  function order(overrides: Partial<NewOrder> = {}): NewOrder {
    return {
      brokerId: broker.id,
      ownerDocument: 'doc_broker',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 1000,
      remaining: 1000,
      status: 'open',
      ...overrides,
    }
  }

  async function insertOrder(values: NewOrder): Promise<string> {
    const [row] = await harness.db.insert(orders).values(values).returning({ id: orders.id })
    return row!.id
  }

  it('cancels an open order, preserving its remaining quantity', async () => {
    const id = await insertOrder(order({ status: 'open', remaining: 1000 }))

    const result = await runCancel(harness.db, id, NOW)

    expect(result?.status).toBe('cancelled')
    expect(result?.remaining).toBe(1000)
    const [row] = await harness.db.select().from(orders).where(eq(orders.id, id))
    expect(row?.status).toBe('cancelled')
    expect(row?.remaining).toBe(1000)
  })

  it('cancels a partially filled order, preserving the resting remainder', async () => {
    const id = await insertOrder(order({ status: 'partially_filled', remaining: 400 }))

    const result = await runCancel(harness.db, id, NOW)

    expect(result?.status).toBe('cancelled')
    expect(result?.remaining).toBe(400) // the unfilled remainder is cancelled, not lost
  })

  it('is a no-op for an already-filled order, leaving the final state unchanged', async () => {
    const id = await insertOrder(order({ status: 'filled', remaining: 0 }))

    const result = await runCancel(harness.db, id, NOW)

    expect(result?.status).toBe('filled') // lost the race to the fill
    const [row] = await harness.db.select().from(orders).where(eq(orders.id, id))
    expect(row?.status).toBe('filled')
    expect(row?.remaining).toBe(0)
  })

  it('is a no-op for an already-terminal order (expired/rejected/cancelled)', async () => {
    for (const status of ['expired', 'rejected', 'cancelled'] as const) {
      const id = await insertOrder(order({ status, remaining: 100 }))
      const result = await runCancel(harness.db, id, NOW)
      expect(result?.status).toBe(status)
    }
  })

  it('returns null when the order does not exist', async () => {
    const result = await runCancel(harness.db, '00000000-0000-0000-0000-000000000000', NOW)
    expect(result).toBeNull()
  })
})
