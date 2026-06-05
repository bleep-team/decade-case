import { inngest } from '../client.js'
import { getDb } from '../db.js'
import { runMatch } from '../run-match.js'

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
  async ({ event, step }) => {
    const { orderId } = event.data

    const tradeIds = await step.run('match-and-persist', () => runMatch(getDb(), orderId))

    if (tradeIds.length > 0) {
      await step.sendEvent(
        'fan-out-executions',
        tradeIds.map((tradeId) => ({ name: 'trade/executed' as const, data: { tradeId } })),
      )
    }

    return { orderId, trades: tradeIds.length }
  },
)
