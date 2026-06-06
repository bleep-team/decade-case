import { beforeEach, describe, expect, it } from 'vitest'
import type { Order, OrderSide } from '@decade/types'
import { matchOrder } from './match.js'
import { truncateToBudget } from './truncate.js'

let seq = 0

function order(p: Partial<Order> & { side: OrderSide }): Order {
  seq += 1
  const quantity = p.quantity ?? 10
  return {
    id: `ord_${seq}`,
    brokerId: 'brk_seller',
    ownerDocument: 'doc_1',
    symbol: 'AAPL',
    type: 'limit',
    limitPrice: 100,
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

describe('truncateToBudget — within budget', () => {
  it('returns the result unchanged when total cost is affordable', () => {
    const askA = order({ side: 'ask', limitPrice: 100, quantity: 10, sequence: 1 })
    const askB = order({ side: 'ask', limitPrice: 200, quantity: 10, sequence: 2 })
    const bid = order({
      side: 'bid',
      brokerId: 'brk_buyer',
      type: 'market',
      limitPrice: null,
      quantity: 20,
    })

    const result = matchOrder(bid, [askA, askB]) // cost: 1000 + 2000 = 3000
    const truncated = truncateToBudget(result, 3000)

    expect(truncated).toBe(result)
  })
})

describe('truncateToBudget — boundary split', () => {
  it('splits the boundary trade to the affordable share count and drops the rest', () => {
    const askA = order({ side: 'ask', limitPrice: 100, quantity: 10, sequence: 1 })
    const askB = order({ side: 'ask', limitPrice: 200, quantity: 10, sequence: 2 })
    const bid = order({
      side: 'bid',
      brokerId: 'brk_buyer',
      type: 'market',
      limitPrice: null,
      quantity: 20,
    })

    const result = matchOrder(bid, [askA, askB]) // trade1: 10@100, trade2: 10@200
    // Budget 1500: trade1 (1000) fully, then 500 left buys floor(500/200) = 2 of trade2.
    const truncated = truncateToBudget(result, 1500)

    expect(truncated.trades).toHaveLength(2)
    expect(truncated.trades[0]).toMatchObject({ askOrderId: askA.id, quantity: 10, price: 100 })
    expect(truncated.trades[1]).toMatchObject({ askOrderId: askB.id, quantity: 2, price: 200 })

    expect(truncated.filledRestingOrders).toHaveLength(2)
    expect(truncated.filledRestingOrders[0]).toMatchObject({
      id: askA.id,
      remaining: 0,
      status: 'filled',
    })
    expect(truncated.filledRestingOrders[1]).toMatchObject({
      id: askB.id,
      remaining: 8,
      status: 'partially_filled',
    })

    expect(truncated.takerOrder).toMatchObject({ remaining: 8, status: 'cancelled' })
  })
})

describe('truncateToBudget — drop-whole degeneracy', () => {
  it('drops the boundary trade entirely when not even one share is affordable', () => {
    const askA = order({ side: 'ask', limitPrice: 100, quantity: 10, sequence: 1 })
    const askB = order({ side: 'ask', limitPrice: 200, quantity: 10, sequence: 2 })
    const bid = order({
      side: 'bid',
      brokerId: 'brk_buyer',
      type: 'market',
      limitPrice: null,
      quantity: 20,
    })

    const result = matchOrder(bid, [askA, askB])
    // Budget 1099: trade1 (1000) fully, 99 left buys floor(99/200) = 0 boundary shares.
    const truncated = truncateToBudget(result, 1099)

    expect(truncated.trades).toHaveLength(1)
    expect(truncated.trades[0]).toMatchObject({ askOrderId: askA.id, quantity: 10 })
    expect(truncated.filledRestingOrders).toHaveLength(1)
    expect(truncated.filledRestingOrders[0]).toMatchObject({
      id: askA.id,
      remaining: 0,
      status: 'filled',
    })
    expect(truncated.takerOrder).toMatchObject({ remaining: 10, status: 'cancelled' })
  })
})
