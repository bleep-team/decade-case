import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { brokers, orders } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb
const sendSpy = vi.fn()

// The runtime singleton normally reads DATABASE_URL; point it at the in-process
// pglite harness and stub the Inngest hand-off so the route runs end to end.
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
  inngest: { send: (...args: unknown[]) => sendSpy(...args) },
}))

// Stand in for a Clerk session — the route should treat this user as the broker.
vi.mock('@decade/auth/server', () => ({
  requireUserId: async () => 'user_route_test',
}))

describe('POST /api/orders', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
    sendSpy.mockClear()
  })

  function postOrder(body: unknown): Promise<Response> {
    return import('./route.js').then(({ POST }) =>
      POST(
        new Request('http://localhost/api/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }),
      ),
    )
  }

  it('persists the order under the authenticated broker, ignoring any brokerId in the body', async () => {
    // A different, real broker the attacker tries to spoof via the body.
    const victim = await harness.seedBroker({ clerkUserId: 'user_victim', name: 'Victim' })

    const response = await postOrder({
      brokerId: victim.id, // should be ignored
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 1000,
      quantity: 10,
    })

    expect(response.status).toBe(201)
    const { orderId } = await response.json()

    // The session broker was auto-provisioned and owns the order.
    const [sessionBroker] = await harness.db
      .select()
      .from(brokers)
      .where(eq(brokers.clerkUserId, 'user_route_test'))
    expect(sessionBroker).toBeDefined()

    const [order] = await harness.db.select().from(orders).where(eq(orders.id, orderId))
    expect(order?.brokerId).toBe(sessionBroker!.id)
    expect(order?.brokerId).not.toBe(victim.id)

    // The matcher was notified for the right symbol.
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'order/submitted', data: { orderId, symbol: 'AAPL' } }),
    )
  })
})
