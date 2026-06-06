import { describe, expect, it } from 'vitest'
import { cancelOrderFn } from './cancel-order.js'
import { matchOrderFn } from './match-order.js'

// Inngest function configs are otherwise opaque; reach through the documented
// `opts`/`trigger` accessors to assert the wiring the AC pins down.
type FnInternals = {
  opts: {
    id: string
    concurrency?: { key?: string; limit?: number }
    triggers?: Array<{ event?: string }>
  }
}

function internals(fn: unknown): FnInternals {
  return fn as unknown as FnInternals
}

function triggerEvent(fn: unknown): string | undefined {
  return internals(fn).opts.triggers?.[0]?.event
}

describe('cancel-order function wiring', () => {
  it('subscribes to the order/cancel-requested event', () => {
    expect(triggerEvent(cancelOrderFn)).toBe('order/cancel-requested')
  })

  it('serializes on the same per-symbol concurrency key as matching (single writer)', () => {
    const cancel = internals(cancelOrderFn).opts.concurrency
    const match = internals(matchOrderFn).opts.concurrency

    expect(cancel?.key).toBe('event.data.symbol')
    expect(cancel?.limit).toBe(1)
    // Identical to matching: cancel and match share one writer per symbol.
    expect(cancel?.key).toBe(match?.key)
    expect(cancel?.limit).toBe(match?.limit)
  })
})
