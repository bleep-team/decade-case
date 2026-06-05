import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { orders, toDomainOrder } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { buildOrderBook } from '@decade/matching-engine'

export const dynamic = 'force-dynamic'

/** List the top of the order book (best bids/asks) for a symbol. */
export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const depthParam = Number(new URL(request.url).searchParams.get('depth') ?? '10')
  const depth = Number.isFinite(depthParam) ? Math.min(Math.max(depthParam, 1), 50) : 10

  const db = getDb()
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.symbol, symbol), inArray(orders.status, ['open', 'partially_filled'])))

  return NextResponse.json(buildOrderBook(symbol, rows.map(toDomainOrder), depth))
}
