import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { orders, stocks, trades } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'

let harness: TestDb

// Point the runtime singleton at the in-process pglite harness.
vi.mock('@decade/exchange-runtime', () => ({
  getDb: () => harness.db,
}))

function getPrice(symbol: string): Promise<Response> {
  return import('./route.js').then(({ GET }) =>
    GET(new Request(`http://localhost/api/stocks/${symbol}/price`), {
      params: Promise.resolve({ symbol }),
    }),
  )
}

describe('GET /api/stocks/[symbol]/price', () => {
  beforeAll(async () => {
    harness = await createTestDb()
  })

  afterAll(async () => {
    await harness.close()
  })

  beforeEach(async () => {
    await harness.reset()
  })

  it('returns the book midpoint when the book is two-sided', async () => {
    const broker = await harness.seedBroker()
    // Best bid 1000, best ask 1020 → midpoint 1010.
    await harness.db.insert(orders).values([
      {
        brokerId: broker.id,
        ownerDocument: 'doc',
        symbol: 'AAPL',
        side: 'bid',
        type: 'limit',
        limitPriceCents: 1000,
        quantity: 5,
        remaining: 5,
        status: 'open',
      },
      {
        brokerId: broker.id,
        ownerDocument: 'doc',
        symbol: 'AAPL',
        side: 'ask',
        type: 'limit',
        limitPriceCents: 1020,
        quantity: 5,
        remaining: 5,
        status: 'open',
      },
    ])

    const response = await getPrice('AAPL')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.price).toBe(1010)
    expect(body.source).toBe('midpoint')
  })

  it('falls back to a last-trade moving average when the book is one-sided', async () => {
    const broker = await harness.seedBroker()
    const counterparty = await harness.seedBroker()
    // One-sided book: only a bid rests, so there is no midpoint.
    const [bid] = await harness.db
      .insert(orders)
      .values({
        brokerId: broker.id,
        ownerDocument: 'doc',
        symbol: 'AAPL',
        side: 'bid',
        type: 'limit',
        limitPriceCents: 1000,
        quantity: 5,
        remaining: 5,
        status: 'open',
      })
      .returning({ id: orders.id })
    const [ask] = await harness.db
      .insert(orders)
      .values({
        brokerId: counterparty.id,
        ownerDocument: 'doc',
        symbol: 'AAPL',
        side: 'ask',
        type: 'limit',
        limitPriceCents: 980,
        quantity: 5,
        remaining: 0,
        status: 'filled',
      })
      .returning({ id: orders.id })

    // Two recent trades at 1000 and 1100 → moving average 1050.
    await harness.db.insert(trades).values([
      {
        symbol: 'AAPL',
        priceCents: 1000,
        quantity: 1,
        bidOrderId: bid!.id,
        askOrderId: ask!.id,
        bidBrokerId: broker.id,
        askBrokerId: counterparty.id,
      },
      {
        symbol: 'AAPL',
        priceCents: 1100,
        quantity: 1,
        bidOrderId: bid!.id,
        askOrderId: ask!.id,
        bidBrokerId: broker.id,
        askBrokerId: counterparty.id,
      },
    ])

    const response = await getPrice('AAPL')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.price).toBe(1050)
    expect(body.source).toBe('last_trade_ma')
  })

  it('falls back to the seeded reference price when the book and trades are empty', async () => {
    await harness.db
      .update(stocks)
      .set({ referencePriceCents: 15000 })
      .where(eq(stocks.symbol, 'AAPL'))

    const response = await getPrice('AAPL')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.price).toBe(15000)
    expect(body.source).toBe('reference')
  })
})
