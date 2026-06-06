import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { orders } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb

vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
  inngest: { send: vi.fn() },
}))

// The acting broker is the Clerk session user; the route lists only its orders.
vi.mock('@decade/auth/server', () => ({
  requireUserId: async () => 'user_lister',
}))

function listOrders(url = 'http://localhost/api/orders'): Promise<Response> {
  return import('./route.js').then(({ GET }) => GET(new Request(url)))
}

async function seedOrder(brokerId: string, symbol: string, price: number): Promise<void> {
  await harness.db.insert(orders).values({
    brokerId,
    ownerDocument: 'doc',
    symbol,
    side: 'bid',
    type: 'limit',
    limitPriceCents: price,
    quantity: 5,
    remaining: 5,
    status: 'open',
  })
}

describe('GET /api/orders', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it("returns only the authenticated broker's orders, not another broker's", async () => {
    // The session broker is auto-provisioned by resolveActingBroker on first call.
    const mine = await harness.seedBroker({ clerkUserId: 'user_lister', name: 'Me' })
    const other = await harness.seedBroker({ clerkUserId: 'user_other', name: 'Other' })

    await seedOrder(mine.id, 'AAPL', 1000)
    await seedOrder(mine.id, 'TSLA', 2000)
    await seedOrder(other.id, 'AAPL', 1500)

    const response = await listOrders()
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.orders).toHaveLength(2)
    for (const order of body.orders) {
      expect(order.brokerId).toBe(mine.id)
    }
    expect(body.orders.some((o: { brokerId: string }) => o.brokerId === other.id)).toBe(false)
  })

  it('paginates with limit and offset', async () => {
    const mine = await harness.seedBroker({ clerkUserId: 'user_lister', name: 'Me' })
    for (let i = 0; i < 5; i += 1) {
      await seedOrder(mine.id, 'AAPL', 1000 + i)
    }

    const first = await listOrders('http://localhost/api/orders?limit=2&offset=0')
    const firstBody = await first.json()
    expect(firstBody.orders).toHaveLength(2)
    expect(firstBody.limit).toBe(2)
    expect(firstBody.offset).toBe(0)

    const second = await listOrders('http://localhost/api/orders?limit=2&offset=4')
    const secondBody = await second.json()
    expect(secondBody.orders).toHaveLength(1)
  })
})
