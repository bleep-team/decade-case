import { beforeEach, describe, expect, it } from 'vitest'
import type { Order, OrderSide } from '@decade/types'
import { matchOrder } from './match.js'

let seq = 0

/** Build an order with sensible defaults; `$10` is 1000 cents. */
function order(p: Partial<Order> & { side: OrderSide }): Order {
  seq += 1
  const quantity = p.quantity ?? 1000
  return {
    id: `ord_${seq}`,
    brokerId: 'brk_a',
    ownerDocument: 'doc_1',
    symbol: 'AAPL',
    type: 'limit',
    limitPrice: 1000,
    quantity,
    remaining: p.remaining ?? quantity,
    status: 'open',
    sequence: p.sequence ?? seq,
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    ...p,
  }
}

beforeEach(() => {
  seq = 0
})

describe('matchOrder — brief example 1: same price', () => {
  it('executes both orders fully at the shared price', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 1000, quantity: 1000 })

    const result = matchOrder(incomingBid, [restingAsk])

    expect(result.trades).toHaveLength(1)
    expect(result.trades[0]).toMatchObject({ price: 1000, quantity: 1000 })
    expect(result.takerOrder.status).toBe('filled')
    expect(result.filledRestingOrders[0]?.status).toBe('filled')
  })
})

describe('matchOrder — brief example 2: no match', () => {
  it('does not execute when the bid is below the ask', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 2000, quantity: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 1000, quantity: 1000 })

    const result = matchOrder(incomingBid, [restingAsk])

    expect(result.trades).toHaveLength(0)
    expect(result.takerOrder.status).toBe('open')
    expect(result.takerOrder.remaining).toBe(1000)
    expect(result.filledRestingOrders).toHaveLength(0)
  })
})

describe('matchOrder — brief example 3: price gap executes at the seller price', () => {
  it('uses the ask price when the incoming bid is higher', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 2000, quantity: 1000 })

    const result = matchOrder(incomingBid, [restingAsk])

    expect(result.trades[0]?.price).toBe(1000)
  })

  it('still uses the ask price when the seller is the incoming order', () => {
    const restingBid = order({ side: 'bid', limitPrice: 2000, quantity: 1000 })
    const incomingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })

    const result = matchOrder(incomingAsk, [restingBid])

    // Execution price is the seller's price (the ask), regardless of who rests.
    expect(result.trades[0]?.price).toBe(1000)
  })
})

describe('matchOrder — partial fills', () => {
  it('fills the smaller incoming quantity and leaves the rest resting', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 1000, quantity: 500 })

    const result = matchOrder(incomingBid, [restingAsk])

    expect(result.trades[0]?.quantity).toBe(500)
    expect(result.takerOrder.status).toBe('filled')
    expect(result.filledRestingOrders[0]).toMatchObject({
      remaining: 500,
      status: 'partially_filled',
    })
  })

  it('sweeps multiple resting orders and leaves the taker partially filled', () => {
    // A sells 500, B sells 500, C buys 1500 -> A and B fill 500 each, C has 500 left.
    const askA = order({ side: 'ask', limitPrice: 1000, quantity: 500 })
    const askB = order({ side: 'ask', limitPrice: 1000, quantity: 500 })
    const incomingBidC = order({ side: 'bid', limitPrice: 1000, quantity: 1500 })

    const result = matchOrder(incomingBidC, [askA, askB])

    expect(result.trades).toHaveLength(2)
    expect(result.trades.every((t) => t.quantity === 500)).toBe(true)
    expect(result.takerOrder).toMatchObject({ remaining: 500, status: 'partially_filled' })
    expect(result.filledRestingOrders.map((o) => o.status)).toEqual(['filled', 'filled'])
  })
})

describe('matchOrder — chronological (price-time) priority', () => {
  it('fills the earliest resting order first when prices tie', () => {
    const askA = order({ side: 'ask', limitPrice: 1000, quantity: 1000, sequence: 1 })
    const askB = order({ side: 'ask', limitPrice: 1000, quantity: 1000, sequence: 2 })
    const incomingBidC = order({ side: 'bid', limitPrice: 1000, quantity: 1000, sequence: 3 })

    const result = matchOrder(incomingBidC, [askB, askA]) // pass out of order on purpose

    expect(result.trades).toHaveLength(1)
    expect(result.trades[0]?.askOrderId).toBe(askA.id)
    expect(result.filledRestingOrders[0]?.id).toBe(askA.id)
  })

  it('matches the best-priced resting order before worse-priced ones', () => {
    const cheapAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000, sequence: 2 })
    const pricyAsk = order({ side: 'ask', limitPrice: 1100, quantity: 1000, sequence: 1 })
    const incomingBid = order({ side: 'bid', limitPrice: 1200, quantity: 1000 })

    const result = matchOrder(incomingBid, [pricyAsk, cheapAsk])

    expect(result.trades[0]?.askOrderId).toBe(cheapAsk.id)
    expect(result.trades[0]?.price).toBe(1000)
  })

  it('stops once the next-best resting order no longer crosses', () => {
    const askCheap = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })
    const askExpensive = order({ side: 'ask', limitPrice: 1200, quantity: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 1100, quantity: 2000 })

    const result = matchOrder(incomingBid, [askCheap, askExpensive])

    expect(result.trades).toHaveLength(1)
    expect(result.trades[0]?.quantity).toBe(1000)
    expect(result.takerOrder).toMatchObject({ remaining: 1000, status: 'partially_filled' })
  })
})

describe('matchOrder — market orders (extension)', () => {
  it('executes a market bid at the resting ask price', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })
    const marketBid = order({ side: 'bid', type: 'market', limitPrice: null, quantity: 1000 })

    const result = matchOrder(marketBid, [restingAsk])

    expect(result.trades[0]?.price).toBe(1000)
    expect(result.takerOrder.status).toBe('filled')
  })

  it('cancels the unfilled remainder of a market order instead of resting it', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 500 })
    const marketBid = order({ side: 'bid', type: 'market', limitPrice: null, quantity: 1000 })

    const result = matchOrder(marketBid, [restingAsk])

    expect(result.trades[0]?.quantity).toBe(500)
    expect(result.takerOrder).toMatchObject({ remaining: 500, status: 'cancelled' })
  })

  it('cancels a market order entirely against an empty book', () => {
    const marketBid = order({ side: 'bid', type: 'market', limitPrice: null, quantity: 1000 })

    const result = matchOrder(marketBid, [])

    expect(result.trades).toHaveLength(0)
    expect(result.takerOrder.status).toBe('cancelled')
  })
})

describe('matchOrder — isolation', () => {
  it('never matches across symbols', () => {
    const otherSymbolAsk = order({ side: 'ask', symbol: 'TSLA', limitPrice: 1000 })
    const incomingBid = order({ side: 'bid', symbol: 'AAPL', limitPrice: 1000 })

    const result = matchOrder(incomingBid, [otherSymbolAsk])

    expect(result.trades).toHaveLength(0)
  })

  it('never matches an order against the same side', () => {
    const restingBid = order({ side: 'bid', limitPrice: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 1000 })

    const result = matchOrder(incomingBid, [restingBid])

    expect(result.trades).toHaveLength(0)
  })

  it('does not mutate the inputs', () => {
    const restingAsk = order({ side: 'ask', limitPrice: 1000, quantity: 1000 })
    const incomingBid = order({ side: 'bid', limitPrice: 1000, quantity: 1000 })
    const restingSnapshot = { ...restingAsk }
    const incomingSnapshot = { ...incomingBid }

    matchOrder(incomingBid, [restingAsk])

    expect(restingAsk).toEqual(restingSnapshot)
    expect(incomingBid).toEqual(incomingSnapshot)
  })
})
