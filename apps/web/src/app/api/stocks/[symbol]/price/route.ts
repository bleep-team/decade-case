import { NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { orders, stocks, toDomainOrder, trades } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { buildOrderBook, midpoint, movingAverage } from '@decade/matching-engine'

export const dynamic = 'force-dynamic'

const SAMPLE_SIZE = 20

/**
 * Current price for a symbol, per the case: the order-book midpoint (mean of the
 * best bid and best ask). When the book is one-sided or empty there is no
 * midpoint, so it falls back first to a moving average over recent trades, then
 * to the symbol's seeded reference price.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const db = getDb()

  // 1. Book-derived midpoint from the live resting orders.
  const restingRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.symbol, symbol), inArray(orders.status, ['open', 'partially_filled'])))
  const book = buildOrderBook(symbol, restingRows.map(toDomainOrder))
  const mid = midpoint(book)
  if (mid !== null) {
    return NextResponse.json({ symbol, price: mid, source: 'midpoint' })
  }

  // 2. Fall back to a moving average over recent execution prices.
  const recent = await db
    .select()
    .from(trades)
    .where(eq(trades.symbol, symbol))
    .orderBy(desc(trades.executedAt))
    .limit(SAMPLE_SIZE)
  const average = movingAverage(recent.map((trade) => trade.priceCents))
  if (average !== null) {
    return NextResponse.json({ symbol, price: average, source: 'last_trade_ma' })
  }

  // 3. Fall back to the seeded reference price for the symbol.
  const [stock] = await db.select().from(stocks).where(eq(stocks.symbol, symbol))
  if (stock?.referencePriceCents != null) {
    return NextResponse.json({ symbol, price: stock.referencePriceCents, source: 'reference' })
  }

  return NextResponse.json({ symbol, price: null, source: 'none' })
}
