import { inngest } from '../client.js'
import { getDb } from '../db.js'
import { executeMatch } from '../run-match.js'
import { publishSettlement } from '../publish-settlement.js'

export const matchOrderFn = inngest.createFunction(
  {
    id: 'match-order',
    // Serialize matching per symbol: at most one run touches a symbol's book at
    // a time. This single-writer guarantee is what makes chronological
    // (price-time) priority and partial fills race-free without app-level locks.
    concurrency: { key: 'event.data.symbol', limit: 1 },
    retries: 3,
  },
  { event: 'order/submitted' },
  async ({ event, step, publish }) => {
    const { orderId } = event.data

    const { result, tradeIds } = await step.run('match-and-persist', () =>
      executeMatch(getDb(), orderId),
    )

    if (tradeIds.length > 0) {
      await step.sendEvent(
        'fan-out-executions',
        tradeIds.map((tradeId) => ({ name: 'trade/executed' as const, data: { tradeId } })),
      )

      // Push private fill/order/balance updates to each affected broker's
      // channel. Non-durable: it is best-effort UI freshness, and the terminal
      // also polls, so a dropped publish degrades cleanly.
      if (result) {
        await publishSettlement(publish, getDb(), result, tradeIds)
      }
    }

    return { orderId, trades: tradeIds.length }
  },
)
