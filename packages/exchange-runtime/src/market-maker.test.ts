import { describe, expect, it } from 'vitest'
import { generateQuoteLadder, stepReference, type LadderConfig } from './market-maker.js'

describe('generateQuoteLadder', () => {
  const config: LadderConfig = {
    spreadCents: 20,
    levelStepCents: 10,
    depth: 3,
    quantity: 100,
  }

  it('produces depth levels on each side', () => {
    const ladder = generateQuoteLadder(10_000, config)
    expect(ladder.bids).toHaveLength(3)
    expect(ladder.asks).toHaveLength(3)
  })

  it('is symmetric around the reference price', () => {
    const reference = 10_000
    const ladder = generateQuoteLadder(reference, config)
    for (let i = 0; i < config.depth; i += 1) {
      const askDistance = ladder.asks[i]!.priceCents - reference
      const bidDistance = reference - ladder.bids[i]!.priceCents
      expect(askDistance).toBe(bidDistance)
    }
  })

  it('orders asks ascending and bids descending (best price first)', () => {
    const ladder = generateQuoteLadder(10_000, config)
    const askPrices = ladder.asks.map((q) => q.priceCents)
    const bidPrices = ladder.bids.map((q) => q.priceCents)
    expect(askPrices).toEqual([...askPrices].sort((a, b) => a - b))
    expect(bidPrices).toEqual([...bidPrices].sort((a, b) => b - a))
  })

  it('never crosses itself: every bid is strictly below every ask', () => {
    const ladder = generateQuoteLadder(10_000, config)
    const highestBid = Math.max(...ladder.bids.map((q) => q.priceCents))
    const lowestAsk = Math.min(...ladder.asks.map((q) => q.priceCents))
    expect(highestBid).toBeLessThan(lowestAsk)
  })

  it('posts the configured quantity at every level', () => {
    const ladder = generateQuoteLadder(10_000, config)
    for (const quote of [...ladder.bids, ...ladder.asks]) {
      expect(quote.quantity).toBe(100)
    }
  })
})

describe('stepReference', () => {
  const config = { maxDriftCents: 50 }

  it('keeps the drift within the configured bound', () => {
    const reference = 10_000
    for (let seed = 0; seed < 1000; seed += 1) {
      const stepped = stepReference(reference, seed, config)
      expect(Math.abs(stepped - reference)).toBeLessThanOrEqual(50)
    }
  })

  it('is deterministic: the same seed yields the same step', () => {
    expect(stepReference(10_000, 42, config)).toBe(stepReference(10_000, 42, config))
  })

  it('never drifts below the price floor', () => {
    // A tiny reference with a large max drift would otherwise go to zero/negative.
    for (let seed = 0; seed < 100; seed += 1) {
      expect(stepReference(10, seed, { maxDriftCents: 50, floorCents: 1 })).toBeGreaterThanOrEqual(
        1,
      )
    }
  })
})
