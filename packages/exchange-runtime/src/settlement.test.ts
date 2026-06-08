import { describe, expect, it } from 'vitest'
import type { MatchResult, ProposedTrade } from '@decade/matching-engine'
import type { Order } from '@decade/types'
import { computeSettlementDeltas } from './settlement.js'

// A throwaway taker order — the settlement math only reads `result.trades`, so
// the taker/resting orders are irrelevant to these assertions.
function taker(): Order {
  return {
    id: 'ord_taker',
    brokerId: 'brk_buyer',
    ownerDocument: 'doc',
    symbol: 'AAPL',
    side: 'bid',
    type: 'limit',
    limitPrice: 100,
    quantity: 0,
    remaining: 0,
    status: 'filled',
    sequence: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
  }
}

function trade(overrides: Partial<ProposedTrade> = {}): ProposedTrade {
  return {
    symbol: 'AAPL',
    price: 100,
    quantity: 10,
    bidOrderId: 'ord_bid',
    askOrderId: 'ord_ask',
    bidBrokerId: 'brk_buyer',
    askBrokerId: 'brk_seller',
    ...overrides,
  }
}

function resultOf(trades: ProposedTrade[]): MatchResult {
  return { trades, takerOrder: taker(), filledRestingOrders: [] }
}

describe('computeSettlementDeltas', () => {
  it('moves the buyer cash down and shares up, the seller the inverse', () => {
    const deltas = computeSettlementDeltas(resultOf([trade({ price: 100, quantity: 10 })]))

    const buyerCash = deltas.cash.find((d) => d.brokerId === 'brk_buyer')
    const sellerCash = deltas.cash.find((d) => d.brokerId === 'brk_seller')
    expect(buyerCash?.deltaCents).toBe(-1000) // pays 100c * 10
    expect(sellerCash?.deltaCents).toBe(1000) // receives the notional

    const buyerPos = deltas.positions.find((d) => d.brokerId === 'brk_buyer')
    const sellerPos = deltas.positions.find((d) => d.brokerId === 'brk_seller')
    expect(buyerPos).toMatchObject({ symbol: 'AAPL', deltaQuantity: 10 }) // gains shares
    expect(sellerPos).toMatchObject({ symbol: 'AAPL', deltaQuantity: -10 }) // loses shares
  })

  it('conserves total cash and total shares across many trades', () => {
    const deltas = computeSettlementDeltas(
      resultOf([
        trade({ price: 100, quantity: 10, askBrokerId: 'brk_s1' }),
        trade({ price: 200, quantity: 5, askBrokerId: 'brk_s2' }),
        trade({ price: 150, quantity: 3, askBrokerId: 'brk_s1' }),
      ]),
    )

    const totalCash = deltas.cash.reduce((sum, d) => sum + d.deltaCents, 0)
    expect(totalCash).toBe(0)

    const totalShares = deltas.positions.reduce((sum, d) => sum + d.deltaQuantity, 0)
    expect(totalShares).toBe(0)
  })

  it('aggregates a broker that fills against several counterparties into one cash delta', () => {
    const deltas = computeSettlementDeltas(
      resultOf([
        trade({ price: 100, quantity: 10, askBrokerId: 'brk_s1' }),
        trade({ price: 200, quantity: 5, askBrokerId: 'brk_s2' }),
      ]),
    )

    const buyerCash = deltas.cash.filter((d) => d.brokerId === 'brk_buyer')
    expect(buyerCash).toHaveLength(1)
    expect(buyerCash[0]?.deltaCents).toBe(-(100 * 10 + 200 * 5))

    const buyerPos = deltas.positions.filter(
      (d) => d.brokerId === 'brk_buyer' && d.symbol === 'AAPL',
    )
    expect(buyerPos).toHaveLength(1)
    expect(buyerPos[0]?.deltaQuantity).toBe(15)
  })

  it('returns no deltas when there were no trades', () => {
    const deltas = computeSettlementDeltas(resultOf([]))
    expect(deltas.cash).toHaveLength(0)
    expect(deltas.positions).toHaveLength(0)
  })
})
