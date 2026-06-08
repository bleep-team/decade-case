import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { orders, type Broker, type NewOrder } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb
const sendSpy = vi.fn()

// Point the runtime singleton at the in-process pglite harness and stub the
// Inngest hand-off so the route runs end to end without external services.
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
  inngest: { send: (...args: unknown[]) => sendSpy(...args) },
}))

// Stand in for a Clerk session — the route treats this user as the broker.
vi.mock('@decade/auth/server', () => ({
  requireUserId: async () => 'user_owner',
}))

describe('POST /api/orders/[id]/cancel', () => {
  let owner: Broker

  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
    sendSpy.mockClear()
    // The session user resolves to this broker (auto-provisioned on first call).
    owner = await harness.seedBroker({ clerkUserId: 'user_owner', name: 'Owner' })
  })

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

  function cancel(id: string): Promise<Response> {
    return import('./route.js').then(({ POST }) =>
      POST(new Request(`http://localhost/api/orders/${id}/cancel`, { method: 'POST' }), {
        params: Promise.resolve({ id }),
      }),
    )
  }

  it('enqueues exactly one cancel event for the owning broker and responds async (202)', async () => {
    const id = await insertOrder({ brokerId: owner.id, symbol: 'AAPL' })

    const response = await cancel(id)

    expect(response.status).toBe(202) // accepted, not waited on
    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'order/cancel-requested',
        data: { orderId: id, symbol: 'AAPL' },
      }),
    )
  })

  it('rejects a non-owner with 403 and enqueues nothing', async () => {
    const stranger = await harness.seedBroker({ clerkUserId: 'user_stranger', name: 'Stranger' })
    const id = await insertOrder({ brokerId: stranger.id, symbol: 'AAPL' })

    const response = await cancel(id)

    expect(response.status).toBe(403)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown order without enqueuing', async () => {
    const response = await cancel('00000000-0000-0000-0000-000000000000')

    expect(response.status).toBe(404)
    expect(sendSpy).not.toHaveBeenCalled()
  })
})
