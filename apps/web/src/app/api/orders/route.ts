import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { orders } from '@decade/db'
import { getDb, hasBuyingPowerFor, inngest } from '@decade/exchange-runtime'
import { resolveActingBrokerOr401 } from '@/lib/broker-identity'
import { parsePagination } from '@/lib/pagination'
import { submitOrderSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/** List the authenticated broker's own orders, newest first (paginated). */
export async function GET(request: Request) {
  const broker = await resolveActingBrokerOr401(request)
  if (broker instanceof NextResponse) {
    return broker
  }

  const { limit, offset } = parsePagination(request)
  const db = getDb()
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.brokerId, broker.id))
    .orderBy(desc(orders.sequence))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({
    brokerId: broker.id,
    limit,
    offset,
    orders: rows.map((row) => ({
      orderId: row.id,
      brokerId: row.brokerId,
      ownerDocument: row.ownerDocument,
      symbol: row.symbol,
      side: row.side,
      type: row.type,
      limitPriceCents: row.limitPriceCents,
      quantity: row.quantity,
      remaining: row.remaining,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    })),
  })
}

/** Submit a bid/ask order. Returns the order id the broker uses to poll status. */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = submitOrderSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // The acting broker comes from the authenticated identity, never the body.
  const broker = await resolveActingBrokerOr401(request)
  if (broker instanceof NextResponse) {
    return broker
  }

  const body = parsed.data
  const db = getDb()

  const limitPriceCents = body.type === 'market' ? null : (body.limitPrice ?? null)
  // Buying-power check: a limit buy that would commit more cash than the broker
  // has free is recorded `rejected` and never reaches the matcher. The matcher's
  // execution-time `truncate` remains the backstop for market buys and races.
  const affordable = await hasBuyingPowerFor(db, broker, {
    side: body.side,
    type: body.type,
    limitPriceCents,
    quantity: body.quantity,
  })

  const [inserted] = await db
    .insert(orders)
    .values({
      brokerId: broker.id,
      ownerDocument: body.ownerDocument,
      symbol: body.symbol,
      side: body.side,
      type: body.type,
      limitPriceCents,
      quantity: body.quantity,
      remaining: body.quantity,
      status: affordable ? 'open' : 'rejected',
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning({ id: orders.id })

  if (!inserted) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Hand off to the matcher; it serializes per symbol so the book stays
  // consistent. A rejected order never enters the book, so it isn't emitted.
  if (affordable) {
    await inngest.send({
      name: 'order/submitted',
      data: { orderId: inserted.id, symbol: body.symbol },
    })
  }

  return NextResponse.json(
    { orderId: inserted.id, status: affordable ? 'open' : 'rejected' },
    { status: 201 },
  )
}
