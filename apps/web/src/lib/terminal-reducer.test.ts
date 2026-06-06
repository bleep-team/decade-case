import { describe, expect, it } from 'vitest'
import type { BrokerUpdate } from '@decade/exchange-runtime'
import { initialTerminalState, terminalReducer, type TerminalState } from './terminal-reducer'

const openOrder: TerminalState = {
  orders: {
    ord_1: { id: 'ord_1', symbol: 'AAPL', side: 'bid', status: 'open', remaining: 10 },
  },
  fills: [],
  balanceCents: 100_000_000,
  positions: {},
}

const fillUpdate: BrokerUpdate = {
  order: { id: 'ord_1', symbol: 'AAPL', side: 'bid', status: 'filled', remaining: 0 },
  fills: [{ tradeId: 'trd_1', symbol: 'AAPL', price: 1000, quantity: 10, side: 'bid' }],
  balanceCents: 99_990_000,
  position: { symbol: 'AAPL', quantity: 10 },
}

describe('terminalReducer', () => {
  it('transitions an open order to filled and applies the balance, fill, and position', () => {
    const next = terminalReducer(openOrder, fillUpdate)

    expect(next.orders['ord_1']?.status).toBe('filled') // open -> filled
    expect(next.orders['ord_1']?.remaining).toBe(0)
    expect(next.balanceCents).toBe(99_990_000)
    expect(next.fills).toEqual([
      { tradeId: 'trd_1', symbol: 'AAPL', price: 1000, quantity: 10, side: 'bid' },
    ])
    expect(next.positions['AAPL']).toBe(10)
  })

  it('does not mutate the previous state (pure transition)', () => {
    const before = structuredClone(openOrder)
    terminalReducer(openOrder, fillUpdate)
    expect(openOrder).toEqual(before)
  })

  it('appends successive fills rather than replacing them', () => {
    const afterFirst = terminalReducer(initialTerminalState, fillUpdate)
    const afterSecond = terminalReducer(afterFirst, {
      ...fillUpdate,
      fills: [{ tradeId: 'trd_2', symbol: 'AAPL', price: 1010, quantity: 5, side: 'bid' }],
      order: { id: 'ord_2', symbol: 'AAPL', side: 'bid', status: 'partially_filled', remaining: 3 },
    })

    expect(afterSecond.fills.map((f) => f.tradeId)).toEqual(['trd_1', 'trd_2'])
    expect(Object.keys(afterSecond.orders).sort()).toEqual(['ord_1', 'ord_2'])
  })
})
