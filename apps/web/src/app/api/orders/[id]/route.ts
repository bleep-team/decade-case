import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { orders } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'

export const dynamic = 'force-dynamic'

/** Get the current status of an order by its id. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const [row] = await db.select().from(orders).where(eq(orders.id, id))

  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    orderId: row.id,
    status: row.status,
    symbol: row.symbol,
    side: row.side,
    type: row.type,
    limitPriceCents: row.limitPriceCents,
    quantity: row.quantity,
    remaining: row.remaining,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  })
}
