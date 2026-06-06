import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrokerUpdate } from '@decade/exchange-runtime'
import {
  createPollingSource,
  createRealtimeSource,
  type TerminalSource,
} from './terminal-source'

const update: BrokerUpdate = {
  order: { id: 'ord_1', symbol: 'AAPL', side: 'bid', status: 'filled', remaining: 0 },
  fills: [{ tradeId: 'trd_1', symbol: 'AAPL', price: 1000, quantity: 10, side: 'bid' }],
  balanceCents: 99_990_000,
  position: { symbol: 'AAPL', quantity: 10 },
}

afterEach(() => {
  vi.useRealTimers()
})

describe('TerminalSource pluggability', () => {
  it('both the polling and realtime backends satisfy the one interface (type-level)', () => {
    // If either factory drifted from `TerminalSource`, this assignment would not
    // compile — the terminal can be wired to either without code changes.
    const sources: TerminalSource[] = [
      createPollingSource(async () => null),
      createRealtimeSource(async () => (async function* () {})()),
    ]
    expect(sources).toHaveLength(2)
  })
})

describe('createPollingSource', () => {
  it('emits fetched updates with no realtime connection, and stops when told', async () => {
    vi.useFakeTimers()
    const fetchUpdate = vi.fn<() => Promise<BrokerUpdate | null>>().mockResolvedValue(update)
    const onUpdate = vi.fn()

    const stop = createPollingSource(fetchUpdate, 1000).start(onUpdate)

    await vi.advanceTimersByTimeAsync(0) // the immediate first tick
    expect(onUpdate).toHaveBeenCalledWith(update)

    await vi.advanceTimersByTimeAsync(1000) // a scheduled tick
    expect(onUpdate).toHaveBeenCalledTimes(2)

    stop()
    await vi.advanceTimersByTimeAsync(3000)
    expect(onUpdate).toHaveBeenCalledTimes(2) // no further ticks after stop
  })
})

describe('createRealtimeSource', () => {
  it('emits the data of each streamed envelope', async () => {
    async function* stream() {
      yield { data: update }
    }
    const onUpdate = vi.fn()

    createRealtimeSource(async () => stream()).start(onUpdate)
    await vi.waitFor(() => expect(onUpdate).toHaveBeenCalledWith(update))
  })
})
