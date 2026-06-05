import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { brokers, createDbClient, orders, stocks, trades, type NewOrder } from '@decade/db'
import { runMatch } from './run-match.js'

// Integration test against a real Postgres. Runs only when TEST_DATABASE_URL is
// set (CI provides a Postgres service; locally: docker run postgres + migrate).
const url = process.env['TEST_DATABASE_URL']
const suite = url ? describe : describe.skip

suite('runMatch (integration)', () => {
  const db = createDbClient(url ?? '')
  const SELLER = '00000000-0000-0000-0000-0000000000a1'
  const BUYER = '00000000-0000-0000-0000-0000000000b2'

  beforeEach(async () => {
    await db.execute(
      sql`TRUNCATE trades, webhook_deliveries, webhook_endpoints, orders, brokers RESTART IDENTITY CASCADE`,
    )
    await db.insert(stocks).values({ symbol: 'AAPL', name: 'Apple Inc.' }).onConflictDoNothing()
    await db.insert(brokers).values([
      { id: SELLER, clerkUserId: 'user_seller', name: 'Seller Broker', cashBalanceCents: 0 },
      { id: BUYER, clerkUserId: 'user_buyer', name: 'Buyer Broker', cashBalanceCents: 0 },
    ])
  })

  afterAll(async () => {
    await db.$client.end()
  })

  async function insertOrder(order: NewOrder): Promise<string> {
    const [row] = await db.insert(orders).values(order).returning({ id: orders.id })
    return row!.id
  }

  function ask(overrides: Partial<NewOrder> = {}): NewOrder {
    return {
      brokerId: SELLER,
      ownerDocument: 'doc_seller',
      symbol: 'AAPL',
      side: 'ask',
      type: 'limit',
      limitPriceCents: 1000,
      quantity: 1000,
      remaining: 1000,
      status: 'open',
      ...overrides,
    }
  }

  function bid(overrides: Partial<NewOrder> = {}): NewOrder {
    return {
      brokerId: BUYER,
      ownerDocument: 'doc_buyer',
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

  it('matches a crossing bid and ask, executing at the seller price and moving balances', async () => {
    const askId = await insertOrder(ask({ limitPriceCents: 1000 }))
    const bidId = await insertOrder(bid({ limitPriceCents: 2000 }))

    const tradeIds = await runMatch(db, bidId)

    expect(tradeIds).toHaveLength(1)

    const [trade] = await db.select().from(trades)
    expect(trade).toMatchObject({ priceCents: 1000, quantity: 1000 }) // seller's price on the gap

    const [askRow] = await db.select().from(orders).where(eq(orders.id, askId))
    const [bidRow] = await db.select().from(orders).where(eq(orders.id, bidId))
    expect(askRow?.status).toBe('filled')
    expect(bidRow?.status).toBe('filled')

    const [seller] = await db.select().from(brokers).where(eq(brokers.id, SELLER))
    const [buyer] = await db.select().from(brokers).where(eq(brokers.id, BUYER))
    expect(seller?.cashBalanceCents).toBe(1_000_000) // +1000c * 1000
    expect(buyer?.cashBalanceCents).toBe(-1_000_000)
  })

  it('partially fills the larger resting order and leaves the remainder', async () => {
    const askId = await insertOrder(ask({ quantity: 1000, remaining: 1000 }))
    const bidId = await insertOrder(bid({ quantity: 400, remaining: 400 }))

    const tradeIds = await runMatch(db, bidId)

    expect(tradeIds).toHaveLength(1)
    const [askRow] = await db.select().from(orders).where(eq(orders.id, askId))
    expect(askRow).toMatchObject({ remaining: 600, status: 'partially_filled' })
  })

  it('does not execute when the bid is below the ask', async () => {
    await insertOrder(ask({ limitPriceCents: 2000 }))
    const bidId = await insertOrder(bid({ limitPriceCents: 1000 }))

    const tradeIds = await runMatch(db, bidId)

    expect(tradeIds).toHaveLength(0)
    expect(await db.select().from(trades)).toHaveLength(0)
  })
})
