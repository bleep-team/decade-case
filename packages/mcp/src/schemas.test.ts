import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { submitOrderShape } from './schemas.js'

const submitOrder = z.object(submitOrderShape)

describe('submitOrderShape', () => {
  it('accepts a valid limit order', () => {
    const parsed = submitOrder.parse({
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'bid',
      type: 'limit',
      limitPrice: 1000,
      quantity: 500,
    })
    expect(parsed.type).toBe('limit')
    expect(parsed.quantity).toBe(500)
  })

  it('defaults the order type to limit', () => {
    const parsed = submitOrder.parse({
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'ask',
      quantity: 100,
    })
    expect(parsed.type).toBe('limit')
  })

  it('does not carry a brokerId — the acting broker comes from the identity', () => {
    expect(Object.keys(submitOrderShape)).not.toContain('brokerId')
  })

  it('rejects an unknown side', () => {
    expect(() =>
      submitOrder.parse({
        ownerDocument: 'doc_1',
        symbol: 'AAPL',
        side: 'buy',
        quantity: 100,
      }),
    ).toThrow()
  })

  it('rejects a non-positive quantity', () => {
    expect(() =>
      submitOrder.parse({
        ownerDocument: 'doc_1',
        symbol: 'AAPL',
        side: 'bid',
        quantity: 0,
      }),
    ).toThrow()
  })
})
