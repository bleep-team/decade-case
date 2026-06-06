import { describe, expect, it } from 'vitest'
import type { Order, OrderSide } from '@decade/types'
import { excludeExpired } from './expiry.js'

let seq = 0

function order(p: Partial<Order> & { side: OrderSide }): Order {
  seq += 1
  return {
    id: `ord_${seq}`,
    brokerId: 'brk_a',
    ownerDocument: 'doc_1',
    symbol: 'AAPL',
    type: 'limit',
    limitPrice: 1000,
    quantity: 1000,
    remaining: 1000,
    status: 'open',
    sequence: seq,
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    ...p,
  }
}

describe('excludeExpired', () => {
  it('removes past-expiresAt orders and keeps live and good-till-cancelled ones', () => {
    const now = '2026-06-06T12:00:00.000Z'
    const expired = order({ side: 'ask', expiresAt: '2026-06-06T11:59:59.000Z' })
    const future = order({ side: 'ask', expiresAt: '2026-06-06T13:00:00.000Z' })
    const gtc = order({ side: 'bid', expiresAt: null })

    const kept = excludeExpired([expired, future, gtc], now)

    expect(kept.map((o) => o.id)).toEqual([future.id, gtc.id])
  })

  it('treats an order expiring exactly at now as expired', () => {
    const now = '2026-06-06T12:00:00.000Z'
    const atNow = order({ side: 'ask', expiresAt: now })

    expect(excludeExpired([atNow], now)).toHaveLength(0)
  })
})
