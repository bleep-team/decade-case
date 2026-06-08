import { inngest } from '../client.js'
import { getDb } from '../db.js'
import {
  driftReference,
  isMockOrder,
  quotableSymbols,
  runMarketMaker,
} from '../run-market-maker.js'

/**
 * Reactive market-maker: on a user order submission, post a fresh two-sided mock
 * ladder for that symbol so a solo broker always has real liquidity to match
 * against. Serialized on the SAME per-symbol concurrency key as matching and
 * cancellation, so the mock ladder is posted race-free against fills.
 *
 * Mock quotes are *resting liquidity* (makers): they are inserted as `open` rows
 * and get matched when a taker (a user order) arrives. They deliberately do NOT
 * emit `order/submitted` — doing so spawned a `match-order` run per quote which,
 * against the per-symbol `limit: 1` matcher, flooded the queue with thousands of
 * runs and starved real user orders. The `isMockOrder` guard remains as a
 * backstop so any stray mock-sourced submission never triggers a re-quote loop.
 */
export const marketMakerFn = inngest.createFunction(
  {
    id: 'market-maker',
    concurrency: { key: 'event.data.symbol', limit: 1 },
    retries: 2,
  },
  { event: 'order/submitted' },
  async ({ event, step }) => {
    const { orderId, symbol } = event.data

    const fromMock = await step.run('is-mock-submitter', () => isMockOrder(getDb(), orderId))
    if (fromMock) {
      return { symbol, requoted: false }
    }

    const result = await step.run('requote', () => runMarketMaker(getDb(), symbol))

    // Any fresh quote that already crosses a resting order is submitted to the
    // real per-symbol matcher so the cross clears instead of resting frozen.
    // Only crossers are emitted (normally none), and the `isMockOrder` guard
    // above stops the resulting submission from re-quoting — so no flood.
    if (result.crossingOrderIds.length > 0) {
      await step.sendEvent(
        'clear-crossing-quotes',
        result.crossingOrderIds.map((id) => ({
          name: 'order/submitted' as const,
          data: { orderId: id, symbol },
        })),
      )
    }

    return {
      symbol,
      requoted: true,
      posted: result.submittedOrderIds.length,
      crossing: result.crossingOrderIds.length,
    }
  },
)

/**
 * Ambient market-maker: once a minute, gently drift each symbol's reference
 * price and re-quote its mock ladder, so the market keeps moving and stale
 * quotes are replaced even when no one is trading. The fresh quotes rest as
 * liquidity for the next taker; only the rare quote that already crosses a
 * resting order is submitted to the matcher to clear the cross.
 */
export const marketMakerCronFn = inngest.createFunction(
  { id: 'market-maker-cron', retries: 2 },
  { cron: '* * * * *' },
  async ({ step }) => {
    const symbols = await step.run('quotable-symbols', () => quotableSymbols(getDb()))
    // A minute-bucketed nonce makes each tick's drift deterministic; the clock
    // read lives here, never in the pure step function.
    const seed = Math.floor(Date.now() / 60_000)

    let posted = 0
    const toClear: { orderId: string; symbol: string }[] = []
    for (const symbol of symbols) {
      const result = await step.run(`requote-${symbol}`, async () => {
        await driftReference(getDb(), symbol, seed)
        return runMarketMaker(getDb(), symbol)
      })
      posted += result.submittedOrderIds.length
      for (const orderId of result.crossingOrderIds) toClear.push({ orderId, symbol })
    }

    // Clear any quotes that landed crossing a resting order, via the real matcher.
    if (toClear.length > 0) {
      await step.sendEvent(
        'clear-crossing-quotes',
        toClear.map(({ orderId, symbol }) => ({
          name: 'order/submitted' as const,
          data: { orderId, symbol },
        })),
      )
    }

    return { symbols: symbols.length, posted, crossing: toClear.length }
  },
)
