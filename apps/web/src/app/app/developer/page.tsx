import { desc, eq } from 'drizzle-orm'
import { resolveOrCreateBroker } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { webhookDeliveries, webhookEndpoints } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
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
        .select()
        .from(webhookDeliveries)
        .where(eq(webhookDeliveries.endpointId, endpoint.id))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(25)
    : []

  const deliveries: DeliveryRow[] = deliveryRows.map((row) => ({
    id: row.id,
    url: endpoint?.url ?? '',
    tradeId: row.tradeId,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
  }))

  return (
    <Developer
      baseUrl={resolveBaseUrl()}
      apiKey={null}
      defaultWebhookUrl={endpoint?.url ?? ''}
      defaultWebhookSecret={endpoint?.secret ?? ''}
      deliveries={deliveries}
    />
  )
}
