import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { orders, trades, webhookDeliveries, webhookEndpoints, type Broker } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb

vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
}))

vi.mock('@decade/auth/server', () => ({
  requireUserId: async () => 'user_deliveries',
}))

function listDeliveries(url = 'http://localhost/api/webhooks/deliveries'): Promise<Response> {
  return import('./route.js').then(({ GET }) => GET(new Request(url)))
}

/** A persisted trade between the broker's own orders, so a delivery can point at it. */
async function seedTrade(broker: Broker): Promise<string> {
  const [bid] = await harness.db
    .insert(orders)
    .values({
      brokerId: broker.id,
      ownerDocument: 'doc',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 1,
      remaining: 0,
      status: 'filled',
    })
    .returning({ id: orders.id })
  const [ask] = await harness.db
    .insert(orders)
    .values({
      brokerId: broker.id,
      ownerDocument: 'doc',
      symbol: 'AAPL',
      side: 'ask',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 1,
      remaining: 0,
      status: 'filled',
    })
    .returning({ id: orders.id })
  const [trade] = await harness.db
    .insert(trades)
    .values({
      symbol: 'AAPL',
      priceCents: 1000,
      quantity: 1,
      bidOrderId: bid!.id,
      askOrderId: ask!.id,
      bidBrokerId: broker.id,
      askBrokerId: broker.id,
    })
    .returning({ id: trades.id })
  return trade!.id
}

describe('GET /api/webhooks/deliveries', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it("returns recent deliveries for the broker's endpoint, newest first", async () => {
    const broker = await harness.seedBroker({ clerkUserId: 'user_deliveries' })
    const [endpoint] = await harness.db
      .insert(webhookEndpoints)
      .values({ brokerId: broker.id, url: 'https://hooks.example/cb', secret: 'whsec' })
      .returning({ id: webhookEndpoints.id })
    const tradeId = await seedTrade(broker)
    await harness.db.insert(webhookDeliveries).values({
      endpointId: endpoint!.id,
      tradeId,
      status: 'delivered',
      attempts: 1,
    })

    const response = await listDeliveries()
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.brokerId).toBe(broker.id)
    expect(body.deliveries).toHaveLength(1)
    expect(body.deliveries[0]).toMatchObject({
      tradeId,
      status: 'delivered',
      attempts: 1,
      url: 'https://hooks.example/cb',
    })
  })

  it("does not return another broker's deliveries", async () => {
    const me = await harness.seedBroker({ clerkUserId: 'user_deliveries' })
    const other = await harness.seedBroker({ clerkUserId: 'user_other' })
    const [otherEndpoint] = await harness.db
      .insert(webhookEndpoints)
      .values({ brokerId: other.id, url: 'https://other.example/cb', secret: 'whsec' })
      .returning({ id: webhookEndpoints.id })
    const tradeId = await seedTrade(other)
    await harness.db
      .insert(webhookDeliveries)
      .values({ endpointId: otherEndpoint!.id, tradeId, status: 'delivered', attempts: 1 })

    const response = await listDeliveries()
    const body = await response.json()
    expect(body.brokerId).toBe(me.id)
    expect(body.deliveries).toEqual([])
  })
})
