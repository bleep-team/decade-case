import { describe, expect, it, vi } from 'vitest'
import type { MatchResult, ProposedTrade } from '@decade/matching-engine'
import type { Order } from '@decade/types'
import { brokerChannel, deriveBrokerUpdates, publishBrokerUpdate, type BrokerUpdate } from './realtime.js'

const update: BrokerUpdate = {
  order: { id: 'ord_1', symbol: 'AAPL', side: 'bid', status: 'filled', remaining: 0 },
  fills: [{ tradeId: 'trd_1', symbol: 'AAPL', price: 1000, quantity: 10, side: 'bid' }],
  balanceCents: 99_990_000,
  position: { symbol: 'AAPL', quantity: 10 },
}

describe('publishBrokerUpdate', () => {
  it('publishes to the broker-scoped channel with the fill/order/balance payload', async () => {
    const publish = vi.fn().mockResolvedValue(undefined)

    await publishBrokerUpdate(publish, 'brk_42', update)

    expect(publish).toHaveBeenCalledTimes(1)
    const message = await publish.mock.calls[0]![0]
    expect(message.channel).toBe('broker:brk_42') // scoped to this broker, no one else's
    expect(message.topic).toBe('updates')
    expect(message.data).toEqual(update)
  })
})

describe('brokerChannel', () => {
  it('names a private channel per broker id', () => {
    expect(brokerChannel('brk_7').name).toBe('broker:brk_7')
    expect(brokerChannel('brk_8').name).toBe('broker:brk_8')
  })
})

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'ord_taker',
    brokerId: 'brk_buyer',
    ownerDocument: 'doc',
    symbol: 'AAPL',
    side: 'bid',
    type: 'limit',
    limitPrice: 1000,
    quantity: 10,
    remaining: 0,
    status: 'filled',
    sequence: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    ...overrides,
  }
}

function trade(overrides: Partial<ProposedTrade> = {}): ProposedTrade {
  return {
    symbol: 'AAPL',
    price: 1000,
    quantity: 10,
    bidOrderId: 'ord_taker',
    askOrderId: 'ord_rest',
    bidBrokerId: 'brk_buyer',
    askBrokerId: 'brk_seller',
    ...overrides,
  }
}

describe('deriveBrokerUpdates', () => {
  it('emits one broker-scoped update per affected order carrying its fill, status, balance, and position', () => {
    const result: MatchResult = {
      takerOrder: order(),
      filledRestingOrders: [
        order({ id: 'ord_rest', brokerId: 'brk_seller', side: 'ask', remaining: 0, status: 'filled' }),
      ],
      trades: [trade()],
    }

    const updates = deriveBrokerUpdates(result, ['trd_1'], {
      balanceOf: (id) => (id === 'brk_buyer' ? 99_990_000 : 100_010_000),
      positionOf: (id) => (id === 'brk_buyer' ? 10 : -10),
    })

    const buyer = updates.find((u) => u.brokerId === 'brk_buyer')
    const seller = updates.find((u) => u.brokerId === 'brk_seller')

    expect(buyer?.update).toMatchObject({
      order: { id: 'ord_taker', status: 'filled', remaining: 0 },
      balanceCents: 99_990_000,
      position: { symbol: 'AAPL', quantity: 10 },
    })
    expect(buyer?.update.fills).toEqual([
      { tradeId: 'trd_1', symbol: 'AAPL', price: 1000, quantity: 10, side: 'bid' },
    ])

    expect(seller?.update).toMatchObject({
      order: { id: 'ord_rest', status: 'filled', remaining: 0 },
      balanceCents: 100_010_000,
      position: { symbol: 'AAPL', quantity: -10 },
    })
    // The seller sees the same execution from the ask side.
    expect(seller?.update.fills).toEqual([
      { tradeId: 'trd_1', symbol: 'AAPL', price: 1000, quantity: 10, side: 'ask' },
    ])
  })
})
