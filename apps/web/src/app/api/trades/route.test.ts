import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { orders, trades } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb

vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
}))

vi.mock('@decade/auth/server', () => ({
  requireUserId: async () => 'user_trader',
}))

function listTrades(url = 'http://localhost/api/trades'): Promise<Response> {
  return import('./route.js').then(({ GET }) => GET(new Request(url)))
}

async function seedOrder(brokerId: string, side: 'bid' | 'ask'): Promise<string> {
  const [row] = await harness.db
    .insert(orders)
    .values({
      brokerId,
      ownerDocument: 'doc',
      symbol: 'AAPL',
      side,
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 5,
      remaining: 0,
      status: 'filled',
    })
    .returning({ id: orders.id })
  return row!.id
}

describe('GET /api/trades', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it('returns trades the authenticated broker is a party to, on either side', async () => {
    const mine = await harness.seedBroker({ clerkUserId: 'user_trader', name: 'Me' })
    const other = await harness.seedBroker({ clerkUserId: 'user_other', name: 'Other' })
    const third = await harness.seedBroker({ clerkUserId: 'user_third', name: 'Third' })

    const myBid = await seedOrder(mine.id, 'bid')
    const otherAsk = await seedOrder(other.id, 'ask')
    const otherBid = await seedOrder(other.id, 'bid')
    const myAsk = await seedOrder(mine.id, 'ask')
    const thirdBid = await seedOrder(third.id, 'bid')
    const thirdAsk = await seedOrder(third.id, 'ask')

    // I am the buyer.
    await harness.db.insert(trades).values({
      symbol: 'AAPL',
      priceCents: 1000,
      quantity: 1,
      bidOrderId: myBid,
      askOrderId: otherAsk,
      bidBrokerId: mine.id,
      askBrokerId: other.id,
    })
    // I am the seller.
    await harness.db.insert(trades).values({
      symbol: 'AAPL',
      priceCents: 1010,
      quantity: 1,
      bidOrderId: otherBid,
      askOrderId: myAsk,
      bidBrokerId: other.id,
      askBrokerId: mine.id,
    })
    // A trade I am not part of.
    await harness.db.insert(trades).values({
      symbol: 'AAPL',
      priceCents: 1020,
      quantity: 1,
      bidOrderId: thirdBid,
      askOrderId: thirdAsk,
      bidBrokerId: third.id,
      askBrokerId: third.id,
    })

    const response = await listTrades()
    expect(response.status).toBe(200)
    const body = await response.json()

    expect(body.trades).toHaveLength(2)
    for (const trade of body.trades) {
      expect(trade.bidBrokerId === mine.id || trade.askBrokerId === mine.id).toBe(true)
    }
  })
})
