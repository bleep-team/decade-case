import { describe, expect, it } from 'vitest'
import type { Order, OrderSide } from '@decade/types'
import { bestAsk, bestBid, buildOrderBook, midpoint } from './book.js'

let seq = 0
function order(p: Partial<Order> & { side: OrderSide }): Order {
  seq += 1
  const quantity = p.quantity ?? 1000
  return {
    id: `ord_${seq}`,
    brokerId: 'brk',
    ownerDocument: 'doc',
    symbol: 'AAPL',
    type: 'limit',
    limitPrice: 1000,
    quantity,
    remaining: p.remaining ?? quantity,
    status: 'open',
    sequence: seq,
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    ...p,
  }
}

describe('buildOrderBook', () => {
  it('aggregates resting orders into price levels, best price first', () => {
    const book = buildOrderBook('AAPL', [
      order({ side: 'bid', limitPrice: 1000, quantity: 100 }),
      order({ side: 'bid', limitPrice: 1000, quantity: 50 }),
      order({ side: 'bid', limitPrice: 1100, quantity: 200 }),
      order({ side: 'ask', limitPrice: 1300, quantity: 70 }),
      order({ side: 'ask', limitPrice: 1200, quantity: 30 }),
    ])

    expect(book.bids).toEqual([
      { price: 1100, quantity: 200, orderCount: 1 },
      { price: 1000, quantity: 150, orderCount: 2 },
    ])
    expect(book.asks).toEqual([
      { price: 1200, quantity: 30, orderCount: 1 },
      { price: 1300, quantity: 70, orderCount: 1 },
    ])
  })

  it('caps each side at the requested depth', () => {
    const orders = Array.from({ length: 15 }, (_, i) =>
      order({ side: 'bid', limitPrice: 1000 + i, quantity: 10 }),
    )
    const book = buildOrderBook('AAPL', orders, 10)
    expect(book.bids).toHaveLength(10)
  })

  it('excludes filled and depleted orders', () => {
    const book = buildOrderBook('AAPL', [
      order({ side: 'bid', limitPrice: 1000, status: 'filled', remaining: 0 }),
      order({ side: 'ask', limitPrice: 1200, quantity: 10 }),
    ])
    expect(book.bids).toHaveLength(0)
    expect(book.asks).toHaveLength(1)
  })
})

describe('book metrics', () => {
  it('reports best bid, best ask, and midpoint', () => {
    const book = buildOrderBook('AAPL', [
      order({ side: 'bid', limitPrice: 1000 }),
      order({ side: 'ask', limitPrice: 1200 }),
    ])
    expect(bestBid(book)).toBe(1000)
    expect(bestAsk(book)).toBe(1200)
    expect(midpoint(book)).toBe(1100)
  })

  it('returns null midpoint when a side is empty', () => {
    const book = buildOrderBook('AAPL', [order({ side: 'bid', limitPrice: 1000 })])
    expect(midpoint(book)).toBeNull()
  })
})
