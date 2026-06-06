import { inngest } from '../client.js'
import { getDb } from '../db.js'
import {
  driftReference,
  isMockOrder,
  quotableSymbols,
  runMarketMaker,
} from '../run-market-maker.js'

/** order/submitted events whose new mock orders feed back to the engine and matcher. */
function submittedEvents(symbol: string, orderIds: string[]) {
  return orderIds.map((orderId) => ({
    name: 'order/submitted' as const,
    data: { orderId, symbol },
  }))
}

/**
 * Reactive market-maker: on a user order submission, post a fresh two-sided mock
 * ladder for that symbol so a solo broker always has real liquidity to match
 * against. Serialized on the SAME per-symbol concurrency key as matching and
 * cancellation, so the mock ladder is posted race-free against fills.
 *
 * Skips its own quotes: re-quoting emits `order/submitted` for the new mock
 * orders (so the engine matches them), which would otherwise re-trigger the
 * market-maker forever.
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
    if (result.submittedOrderIds.length > 0) {
      await step.sendEvent('post-mock-liquidity', submittedEvents(symbol, result.submittedOrderIds))
    }

    return { symbol, requoted: true, posted: result.submittedOrderIds.length }
  },
)

/**
 * Ambient market-maker: once a minute, gently drift each symbol's reference
 * price and re-quote its mock ladder, so the market keeps moving and stale
 * quotes are replaced even when no one is trading.
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
    for (const symbol of symbols) {
      const result = await step.run(`requote-${symbol}`, async () => {
        await driftReference(getDb(), symbol, seed)
        return runMarketMaker(getDb(), symbol)
      })
      if (result.submittedOrderIds.length > 0) {
        await step.sendEvent(`post-${symbol}`, submittedEvents(symbol, result.submittedOrderIds))
        posted += result.submittedOrderIds.length
      }
    }

    return { symbols: symbols.length, posted }
  },
)
