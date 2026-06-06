import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { brokers, orders, positions, trades, type Broker, type NewOrder } from '@decade/db'
import { createTestDb, type TestDb } from '@decade/db/testing'
import { runMatch } from './run-match.js'

// Settlement/runMatch against the in-process pglite harness — no external
// Postgres, no TEST_DATABASE_URL. Exercises expiry exclusion, cash-leg
// enforcement (rejects), double-entry position moves, and permissive shorts.
describe('runMatch (pglite harness)', () => {
  let harness: TestDb
  let seller: Broker
  let buyer: Broker

  const NOW = new Date('2026-06-06T12:00:00.000Z')

  beforeEach(async () => {
    if (!harness) harness = await createTestDb()
    await harness.reset()
    seller = await harness.seedBroker({ name: 'Seller', cashBalanceCents: 100_000_000 })
    buyer = await harness.seedBroker({ name: 'Buyer', cashBalanceCents: 100_000_000 })
  })

  afterAll(async () => {
    if (harness) await harness.close()
  })

  async function insertOrder(order: NewOrder): Promise<string> {
    const [row] = await harness.db.insert(orders).values(order).returning({ id: orders.id })
    return row!.id
  }

  function ask(overrides: Partial<NewOrder> = {}): NewOrder {
    return {
      brokerId: seller.id,
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
      brokerId: buyer.id,
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

  async function cashOf(brokerId: string): Promise<number> {
    const [row] = await harness.db.select().from(brokers).where(eq(brokers.id, brokerId))
    return row!.cashBalanceCents
  }

  async function positionOf(brokerId: string, symbol: string): Promise<number | undefined> {
    const [row] = await harness.db
      .select()
      .from(positions)
      .where(and(eq(positions.brokerId, brokerId), eq(positions.symbol, symbol)))
    return row?.quantity
  }

  it('excludes an expired resting order from the book so it is not matched', async () => {
    const expiredAsk = new Date('2026-06-06T11:00:00.000Z') // an hour before NOW
    await insertOrder(ask({ limitPriceCents: 1000, expiresAt: expiredAsk }))
    const bidId = await insertOrder(bid({ limitPriceCents: 2000 }))

    const tradeIds = await runMatch(harness.db, bidId, NOW)

    expect(tradeIds).toHaveLength(0)
    expect(await harness.db.select().from(trades)).toHaveLength(0)
    const [bidRow] = await harness.db.select().from(orders).where(eq(orders.id, bidId))
    expect(bidRow?.status).toBe('open') // rested; nothing to cross
  })

  it('moves both brokers’ cash and writes positions for both sides, conserved', async () => {
    await insertOrder(ask({ limitPriceCents: 1000, quantity: 1000, remaining: 1000 }))
    const bidId = await insertOrder(bid({ limitPriceCents: 2000, quantity: 1000, remaining: 1000 }))

    const tradeIds = await runMatch(harness.db, bidId, NOW)
    expect(tradeIds).toHaveLength(1)

    const sellerCash = await cashOf(seller.id)
    const buyerCash = await cashOf(buyer.id)
    const notional = 1000 * 1000 // executes at the seller's 1000c
    expect(sellerCash).toBe(100_000_000 + notional)
    expect(buyerCash).toBe(100_000_000 - notional)
    expect(sellerCash + buyerCash).toBe(200_000_000) // total cash conserved

    const sellerPos = await positionOf(seller.id, 'AAPL')
    const buyerPos = await positionOf(buyer.id, 'AAPL')
    expect(buyerPos).toBe(1000)
    expect(sellerPos).toBe(-1000)
    expect((sellerPos ?? 0) + (buyerPos ?? 0)).toBe(0) // total shares conserved
  })

  it('truncates a market buy to the cash the taker can afford and rejects the remainder', async () => {
    const seller2 = await harness.seedBroker({ name: 'Seller 2', cashBalanceCents: 100_000_000 })
    // Two ask levels: 10 @ 100c then 10 @ 200c.
    await insertOrder(
      ask({ brokerId: seller.id, limitPriceCents: 100, quantity: 10, remaining: 10 }),
    )
    await insertOrder(
      ask({ brokerId: seller2.id, limitPriceCents: 200, quantity: 10, remaining: 10 }),
    )

    // Underfund the buyer to 1500c: covers 10@100 (1000c) fully, then floor(500/200)=2 @ 200c.
    await harness.db.update(brokers).set({ cashBalanceCents: 1500 }).where(eq(brokers.id, buyer.id))

    const bidId = await insertOrder(
      bid({ type: 'market', limitPriceCents: null, quantity: 20, remaining: 20 }),
    )

    const tradeIds = await runMatch(harness.db, bidId, NOW)
    expect(tradeIds).toHaveLength(2) // boundary split, not the whole 20

    const tradeRows = await harness.db.select().from(trades)
    const quantities = tradeRows.map((t) => t.quantity).sort((a, b) => a - b)
    expect(quantities).toEqual([2, 10]) // 10 fully, 2 at the boundary

    const [bidRow] = await harness.db.select().from(orders).where(eq(orders.id, bidId))
    expect(bidRow?.status).toBe('rejected')
    expect(bidRow?.remaining).toBe(8) // 20 - 12 settled

    expect(await cashOf(buyer.id)).toBe(100) // spent 1400c (10@100 + 2@200), never negative
  })

  it('rejects a limit buy from an underfunded broker rather than settling a negative balance', async () => {
    await harness.db.update(brokers).set({ cashBalanceCents: 50 }).where(eq(brokers.id, buyer.id))
    await insertOrder(ask({ limitPriceCents: 100, quantity: 1, remaining: 1 }))
    const bidId = await insertOrder(bid({ limitPriceCents: 100, quantity: 1, remaining: 1 }))

    const tradeIds = await runMatch(harness.db, bidId, NOW)

    expect(tradeIds).toHaveLength(0) // could not afford even one share
    const [bidRow] = await harness.db.select().from(orders).where(eq(orders.id, bidId))
    expect(bidRow?.status).toBe('rejected')
    expect(await cashOf(buyer.id)).toBe(50) // unchanged, never negative
  })

  it('allows a short sell: a seller with no inventory ends with a negative position', async () => {
    // Buyer rests a funded bid; the seller (taker) holds no AAPL and shorts it.
    await insertOrder(bid({ limitPriceCents: 1000, quantity: 100, remaining: 100 }))
    const askId = await insertOrder(ask({ limitPriceCents: 1000, quantity: 100, remaining: 100 }))

    const tradeIds = await runMatch(harness.db, askId, NOW)
    expect(tradeIds).toHaveLength(1)

    const [askRow] = await harness.db.select().from(orders).where(eq(orders.id, askId))
    expect(askRow?.status).toBe('filled') // permitted, not rejected

    expect(await positionOf(seller.id, 'AAPL')).toBe(-100) // recorded short
    expect(await positionOf(buyer.id, 'AAPL')).toBe(100)
  })
})
