import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { trades } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { movingAverage } from '@decade/matching-engine'

export const dynamic = 'force-dynamic'

const SAMPLE_SIZE = 20

/** Current price for a symbol: a moving average over recent execution prices. */
export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const db = getDb()
  const recent = await db
    .select()
    .from(trades)
    .where(eq(trades.symbol, symbol))
    .orderBy(desc(trades.executedAt))
    .limit(SAMPLE_SIZE)

  const prices = recent.map((trade) => trade.priceCents)
  return NextResponse.json({ symbol, price: movingAverage(prices), sampleSize: prices.length })
}
