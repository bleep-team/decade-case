import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { orders } from '@decade/db'
import { getDb } from '@decade/exchange-runtime'
import { resolveActingBrokerOr401 } from '@/lib/broker-identity'
import { createOrder } from '@/lib/exchange-service'
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

  // The case lists a broker identifier as an order field. We accept it, but only
  // to confirm the broker is submitting as itself — a `brokerId` that disagrees
  // with the authenticated identity is rejected, never honoured. Omitting it is
  // fine; the acting broker is the identity's regardless.
  if (parsed.data.brokerId && parsed.data.brokerId !== broker.id) {
    return NextResponse.json(
      { error: 'broker_mismatch', message: 'brokerId does not match the authenticated broker' },
      { status: 403 },
    )
  }

  // Insert + buying-power check + matcher hand-off live in the shared service,
  // so this route and the MCP `submit_order` tool behave identically.
  const { orderId, status } = await createOrder(getDb(), broker, parsed.data)
  return NextResponse.json({ orderId, status }, { status: 201 })
}
