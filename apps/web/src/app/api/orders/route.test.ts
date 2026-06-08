import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { orders } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb
const sendSpy = vi.fn()
// Controls the mocked buying-power check so both branches can be exercised.
let affordableStub = true

// The runtime singleton normally reads DATABASE_URL; point it at the in-process
// pglite harness and stub the Inngest hand-off so the route runs end to end.
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
  inngest: { send: (...args: unknown[]) => sendSpy(...args) },
  hasBuyingPowerFor: async () => affordableStub,
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
    affordableStub = true
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

  it('rejects a body brokerId that is not the authenticated broker', async () => {
    // A different, real broker the caller tries to act as via the body.
    const victim = await harness.seedBroker({ clerkUserId: 'user_victim', name: 'Victim' })

    const response = await postOrder({
      brokerId: victim.id, // not the session broker → must be rejected
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 1000,
      quantity: 10,
    })

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('broker_mismatch')
    // Nothing was inserted or matched.
    expect(await harness.db.select().from(orders)).toHaveLength(0)
    expect(sendSpy).not.toHaveBeenCalled()
  })

  it('persists the order under the authenticated broker when the body brokerId matches', async () => {
    // Pre-provision the session broker so we can send its own id in the body.
    const session = await harness.seedBroker({ clerkUserId: 'user_route_test', name: 'Me' })

    const response = await postOrder({
      brokerId: session.id, // matches the authenticated identity
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 1000,
      quantity: 10,
    })

    expect(response.status).toBe(201)
    const { orderId } = await response.json()

    const [order] = await harness.db.select().from(orders).where(eq(orders.id, orderId))
    expect(order?.brokerId).toBe(session.id)

    // The matcher was notified for the right symbol.
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'order/submitted', data: { orderId, symbol: 'AAPL' } }),
    )
  })

  it('records an underfunded buy as rejected and never hands it to the matcher', async () => {
    affordableStub = false

    const response = await postOrder({
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 1000,
      quantity: 10,
    })

    expect(response.status).toBe(201)
    const { orderId, status } = await response.json()
    expect(status).toBe('rejected')

    const [order] = await harness.db.select().from(orders).where(eq(orders.id, orderId))
    expect(order?.status).toBe('rejected')
    // A rejected order never enters the book, so the matcher is not notified.
    expect(sendSpy).not.toHaveBeenCalled()
  })
})
