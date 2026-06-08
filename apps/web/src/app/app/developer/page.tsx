import { desc, eq } from 'drizzle-orm'
import { resolveOrCreateBroker } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { trades, webhookDeliveries, webhookEndpoints } from '@decade/db'
import { buildWebhookPayload, getDb } from '@decade/exchange-runtime'
import { Developer } from '@/components/developer/developer'
import type { DeliveryRow } from '@/components/developer/webhook-card'

export const dynamic = 'force-dynamic'

/** Resolve the exchange origin for the MCP endpoint and REST examples. */
function resolveBaseUrl(): string {
  const explicit = process.env['NEXT_PUBLIC_APP_URL']
  if (explicit) {
    return explicit
  }
  const vercel = process.env['VERCEL_PROJECT_PRODUCTION_URL']
  return vercel ? `https://${vercel}` : 'http://localhost:3000'
}

/** The Developer page — API key, webhook settings, and MCP/REST integration. */
export default async function DeveloperPage() {
  const userId = await requireUserId()
  const db = getDb()
  const broker = await resolveOrCreateBroker(db, userId)

  const [endpoint] = await db
    .select()
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.brokerId, broker.id))

  const deliveryRows = endpoint
    ? await db
        .select({
          id: webhookDeliveries.id,
          tradeId: webhookDeliveries.tradeId,
          status: webhookDeliveries.status,
          attempts: webhookDeliveries.attempts,
          createdAt: webhookDeliveries.createdAt,
          tradeSymbol: trades.symbol,
          tradePriceCents: trades.priceCents,
          tradeQuantity: trades.quantity,
          tradeBidOrderId: trades.bidOrderId,
          tradeAskOrderId: trades.askOrderId,
          tradeExecutedAt: trades.executedAt,
        })
        .from(webhookDeliveries)
        .innerJoin(trades, eq(webhookDeliveries.tradeId, trades.id))
        .where(eq(webhookDeliveries.endpointId, endpoint.id))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(10)
    : []

  const deliveries: DeliveryRow[] = deliveryRows.map((row) => ({
    id: row.id,
    url: endpoint?.url ?? '',
    tradeId: row.tradeId,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    // The exact body that was delivered, reconstructed from the (immutable) trade.
    payload: JSON.stringify(
      buildWebhookPayload({
        id: row.tradeId,
        symbol: row.tradeSymbol,
        priceCents: row.tradePriceCents,
        quantity: row.tradeQuantity,
        bidOrderId: row.tradeBidOrderId,
        askOrderId: row.tradeAskOrderId,
        executedAt: row.tradeExecutedAt.toISOString(),
      }),
      null,
      2,
    ),
  }))

  return (
    <Developer
      baseUrl={resolveBaseUrl()}
      apiKey={null}
      defaultWebhookUrl={endpoint?.url ?? ''}
      defaultWebhookSecret={endpoint?.secret ?? ''}
      defaultWebhookActive={endpoint?.active ?? true}
      deliveries={deliveries}
    />
  )
}
