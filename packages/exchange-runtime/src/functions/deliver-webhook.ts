import { and, eq, inArray } from 'drizzle-orm'
import { trades, webhookDeliveries, webhookEndpoints } from '@decade/db'
import { inngest } from '../client.js'
import { getDb } from '../db.js'
import { buildWebhookPayload, signPayload } from '../webhook.js'

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

    for (const endpoint of target.endpoints) {
      await step.run(`deliver-${endpoint.id}`, async () => {
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-decade-signature': signPayload(endpoint.secret, body),
          },
          body,
        })
        if (!response.ok) {
          throw new Error(`Webhook ${endpoint.id} failed with ${response.status}`)
        }
        await getDb()
          .insert(webhookDeliveries)
          .values({ endpointId: endpoint.id, tradeId, status: 'delivered', attempts: 1 })
      })
      delivered += 1
    }

    return { delivered }
  },
)
