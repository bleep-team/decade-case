import { NextResponse } from 'next/server'
import { desc, eq, or } from 'drizzle-orm'
import { trades } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { resolveActingBrokerOr401 } from '@/lib/broker-identity'
import { parsePagination } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

/**
 * List the trades the authenticated broker is a party to (as buyer or seller),
 * newest first (paginated).
 */
export async function GET(request: Request) {
  const broker = await resolveActingBrokerOr401(request)
  if (broker instanceof NextResponse) {
    return broker
  }

  const { limit, offset } = parsePagination(request)
  const db = getDb()
  const rows = await db
    .select()
    .from(trades)
    .where(or(eq(trades.bidBrokerId, broker.id), eq(trades.askBrokerId, broker.id)))
    .orderBy(desc(trades.executedAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({
    brokerId: broker.id,
    limit,
    offset,
    trades: rows.map((row) => ({
      tradeId: row.id,
      symbol: row.symbol,
      priceCents: row.priceCents,
      quantity: row.quantity,
      bidOrderId: row.bidOrderId,
      askOrderId: row.askOrderId,
      bidBrokerId: row.bidBrokerId,
      askBrokerId: row.askBrokerId,
      side: row.bidBrokerId === broker.id ? 'bid' : 'ask',
      executedAt: row.executedAt,
    })),
  })
}
