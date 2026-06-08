import { describe, expect, it } from 'vitest'
import { submitOrderSchema } from './validation'

const validLimit = {
  brokerId: 'brk_1',
  ownerDocument: 'doc_1',
  symbol: 'AAPL',
  side: 'bid' as const,
  type: 'limit' as const,
  limitPrice: 1000,
  quantity: 500,
}

describe('submitOrderSchema', () => {
  it('accepts a valid limit order', () => {
    expect(submitOrderSchema.parse(validLimit).limitPrice).toBe(1000)
  })

  it('rejects a limit order without a price', () => {
    const { limitPrice: _omit, ...noPrice } = validLimit
    expect(submitOrderSchema.safeParse(noPrice).success).toBe(false)
  })

  it('accepts a market order without a price', () => {
    const result = submitOrderSchema.safeParse({
      brokerId: 'brk_1',
      ownerDocument: 'doc_1',
      symbol: 'AAPL',
      side: 'ask',
      type: 'market',
      quantity: 100,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a market order that carries a price', () => {
    expect(
      submitOrderSchema.safeParse({ ...validLimit, type: 'market', limitPrice: 1000 }).success,
    ).toBe(false)
  })
})
