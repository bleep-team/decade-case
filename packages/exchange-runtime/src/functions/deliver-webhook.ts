import { and, eq, inArray } from 'drizzle-orm'
import { trades, webhookDeliveries, webhookEndpoints } from '@decade/db'
import { inngest } from '../client.js'
import { getDb } from '../db.js'
import { attemptWebhookDelivery, buildWebhookPayload } from '../webhook.js'

export const deliverWebhookFn = inngest.createFunction(
  { id: 'deliver-webhook', retries: 4 },
  { event: 'trade/executed' },
  async ({ event, step }) => {
    const { tradeId } = event.data

    const target = await step.run('load-targets', async () => {
      const db = getDb()
      const tradeRows = await db.select().from(trades).where(eq(trades.id, tradeId))
      const trade = tradeRows[0]
      if (!trade) {
        return null
      }

      const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.active, true),
            inArray(webhookEndpoints.brokerId, [trade.bidBrokerId, trade.askBrokerId]),
          ),
        )

      const payload = buildWebhookPayload({
        id: trade.id,
        symbol: trade.symbol,
        priceCents: trade.priceCents,
        quantity: trade.quantity,
        bidOrderId: trade.bidOrderId,
        askOrderId: trade.askOrderId,
        executedAt: trade.executedAt.toISOString(),
      })

      return { payload, endpoints }
    })

    if (!target || target.endpoints.length === 0) {
      return { delivered: 0 }
    }

    const body = JSON.stringify(target.payload)
    let delivered = 0
    let failed = 0

    // Each delivery records a row for its outcome — success OR failure (with the
    // attempt count and last error) — so "Recent deliveries" reflects failures too.
    for (const endpoint of target.endpoints) {
      const outcome = await step.run(`deliver-${endpoint.id}`, async () => {
        const result = await attemptWebhookDelivery(endpoint, body)
        await getDb().insert(webhookDeliveries).values({
          endpointId: endpoint.id,
          tradeId,
          status: result.status,
          attempts: result.attempts,
          lastError: result.lastError,
        })
        return result
      })
      if (outcome.status === 'delivered') {
        delivered += 1
      } else {
        failed += 1
      }
    }

    return { delivered, failed }
  },
)
