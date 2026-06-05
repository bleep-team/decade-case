import { describe, expect, it } from 'vitest'
import { toDomainOrder, type OrderRow } from './mappers.js'

const baseRow: OrderRow = {
  id: 'ord_1',
  sequence: 42,
  brokerId: 'brk_1',
  ownerDocument: 'doc_1',
  symbol: 'AAPL',
  side: 'bid',
  type: 'limit',
  limitPriceCents: 1000,
  quantity: 1000,
  remaining: 400,
  status: 'partially_filled',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  expiresAt: new Date('2026-01-02T00:00:00.000Z'),
}

describe('toDomainOrder', () => {
  it('maps cents columns and serializes timestamps to ISO strings', () => {
    expect(toDomainOrder(baseRow)).toEqual({
      id: 'ord_1',
      brokerId: 'brk_1',
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 1000,
      quantity: 1000,
      remaining: 400,
      status: 'partially_filled',
      sequence: 42,
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('passes through a null limit price (market order) and null expiry', () => {
    const market = toDomainOrder({
      ...baseRow,
      type: 'market',
      limitPriceCents: null,
      expiresAt: null,
    })
    expect(market.limitPrice).toBeNull()
    expect(market.expiresAt).toBeNull()
  })
})
