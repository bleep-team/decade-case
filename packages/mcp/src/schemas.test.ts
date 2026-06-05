import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { submitOrderShape } from './schemas.js'

const submitOrder = z.object(submitOrderShape)

describe('submitOrderShape', () => {
  it('accepts a valid limit order', () => {
    const parsed = submitOrder.parse({
      brokerId: 'brk_1',
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
      brokerId: 'brk_1',
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'ask',
      quantity: 100,
    })
    expect(parsed.type).toBe('limit')
  })

  it('rejects an unknown side', () => {
    expect(() =>
      submitOrder.parse({
        brokerId: 'brk_1',
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
        brokerId: 'brk_1',
        ownerDocument: 'doc_1',
        symbol: 'AAPL',
        side: 'bid',
        quantity: 0,
      }),
    ).toThrow()
  })
})
