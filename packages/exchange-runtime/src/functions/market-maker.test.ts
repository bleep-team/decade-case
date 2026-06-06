import { describe, expect, it } from 'vitest'
import { marketMakerFn, marketMakerCronFn } from './market-maker.js'
import { matchOrderFn } from './match-order.js'

// Inngest function configs are otherwise opaque; reach through the documented
// `opts`/`trigger` accessors to assert the wiring the AC pins down.
type FnInternals = {
  opts: {
    id: string
    concurrency?: { key?: string; limit?: number }
    triggers?: Array<{ event?: string; cron?: string }>
  }
}

function internals(fn: unknown): FnInternals {
  return fn as unknown as FnInternals
}

describe('market-maker function wiring', () => {
  it('reacts to order submissions for instant liquidity', () => {
    expect(internals(marketMakerFn).opts.triggers?.[0]?.event).toBe('order/submitted')
  })

  it('serializes on the same per-symbol writer key as matching', () => {
    const mm = internals(marketMakerFn).opts.concurrency
    const match = internals(matchOrderFn).opts.concurrency
    expect(mm?.key).toBe('event.data.symbol')
    expect(mm?.limit).toBe(1)
    expect(mm?.key).toBe(match?.key)
    expect(mm?.limit).toBe(match?.limit)
  })

  it('runs ambiently once a minute via a cron trigger', () => {
    expect(internals(marketMakerCronFn).opts.triggers?.[0]?.cron).toBe('* * * * *')
  })
})
