import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { brokers } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'

export const dynamic = 'force-dynamic'

/** Return the settled cash balance of a broker. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getDb()
  const [row] = await db.select().from(brokers).where(eq(brokers.id, id))

  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    brokerId: row.id,
    name: row.name,
    cashBalanceCents: row.cashBalanceCents,
  })
}
