import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { brokers, positions } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'

export const dynamic = 'force-dynamic'

/** Return a broker's balance: settled cash plus its signed share positions. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const [row] = await db.select().from(brokers).where(eq(brokers.id, id))

  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const held = await db
    .select()
    .from(positions)
    .where(eq(positions.brokerId, id))
    .orderBy(asc(positions.symbol))

  return NextResponse.json({
    brokerId: row.id,
    name: row.name,
    cashBalanceCents: row.cashBalanceCents,
    positions: held.map((position) => ({
      symbol: position.symbol,
      quantity: position.quantity,
    })),
  })
}
