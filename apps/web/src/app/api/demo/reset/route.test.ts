import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { STARTING_BALANCE_CENTS } from '@decade/auth'
import { brokers, orders, type NewOrder } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { eq } from 'drizzle-orm'

let harness: TestDb

vi.mock('@decade/exchange-runtime', async () => {
  const actual = await vi.importActual<typeof import('@decade/exchange-runtime')>(
    '@decade/exchange-runtime',
  )
  return { ...actual, getDb: () => harness.db }
})

vi.mock('@decade/auth/server', () => ({
  requireUserId: vi.fn(async () => 'user_resetter'),
}))

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

function reset(): Promise<Response> {
  return import('./route.js').then(({ POST }) =>
    POST(new Request('http://localhost/api/demo/reset', { method: 'POST' })),
  )
}

describe('POST /api/demo/reset', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it("cancels the broker's open orders and restores the starting balance", async () => {
    const broker = await harness.seedBroker({ clerkUserId: 'user_resetter', cashBalanceCents: 42 })
    const openId = await insertOrder({ brokerId: broker.id, status: 'open' })

    const response = await reset()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.cancelledOrderIds).toEqual([openId])
    expect(body.cashBalanceCents).toBe(STARTING_BALANCE_CENTS)

    const [order] = await harness.db.select().from(orders).where(eq(orders.id, openId))
    expect(order!.status).toBe('cancelled')
    const [refreshed] = await harness.db.select().from(brokers).where(eq(brokers.id, broker.id))
    expect(refreshed!.cashBalanceCents).toBe(STARTING_BALANCE_CENTS)
  })

  it('rejects an anonymous caller with 401', async () => {
    const { UnauthorizedError } = await import('@decade/auth')
    const { requireUserId } = await import('@decade/auth/server')
    vi.mocked(requireUserId).mockRejectedValueOnce(new UnauthorizedError('anon'))

    const response = await reset()
    expect(response.status).toBe(401)
  })
})
