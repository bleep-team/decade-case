import { describe, expect, it } from 'vitest'
import { centsToDollars, dollarsToCents, formatUsd, notional } from './index.js'

describe('money', () => {
  it('round-trips dollars through integer cents', () => {
    expect(dollarsToCents(10.5)).toBe(1050)
    expect(centsToDollars(1050)).toBe(10.5)
  })

  it('avoids float drift on cent conversion', () => {
    expect(dollarsToCents(0.1 + 0.2)).toBe(30)
  })

  it('formats cents as USD', () => {
    expect(formatUsd(1050)).toBe('$10.50')
    expect(formatUsd(1000)).toBe('$10.00')
  })

  it('computes notional value', () => {
    expect(notional(1000, 500)).toBe(500_000)
  })
})
