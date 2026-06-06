import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { webhookDeliveries, webhookEndpoints } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { resolveActingBrokerOr401 } from '@/lib/broker-identity'
import { parsePagination } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

/**
 * List recent webhook deliveries for the authenticated broker's endpoint(s),
 * newest first (paginated). Joining through `webhook_endpoints` scopes the rows
 * to the broker, so a caller only ever sees its own delivery attempts.
 */
export async function GET(request: Request) {
  const broker = await resolveActingBrokerOr401(request)
  if (broker instanceof NextResponse) {
    return broker
  }

  const { limit, offset } = parsePagination(request)
  const db = getDb()
  const rows = await db
    .select({
      id: webhookDeliveries.id,
      endpointId: webhookDeliveries.endpointId,
      tradeId: webhookDeliveries.tradeId,
      status: webhookDeliveries.status,
      attempts: webhookDeliveries.attempts,
      lastError: webhookDeliveries.lastError,
      createdAt: webhookDeliveries.createdAt,
      url: webhookEndpoints.url,
    })
    .from(webhookDeliveries)
    .innerJoin(webhookEndpoints, eq(webhookDeliveries.endpointId, webhookEndpoints.id))
    .where(eq(webhookEndpoints.brokerId, broker.id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({
    brokerId: broker.id,
    limit,
    offset,
    deliveries: rows.map((row) => ({
      id: row.id,
      endpointId: row.endpointId,
      url: row.url,
      tradeId: row.tradeId,
      status: row.status,
      attempts: row.attempts,
      lastError: row.lastError,
      createdAt: row.createdAt,
    })),
  })
}
