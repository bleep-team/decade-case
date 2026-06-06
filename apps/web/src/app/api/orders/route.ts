import { NextResponse } from 'next/server'
import { UnauthorizedError } from '@decade/auth'
import { orders } from '@decade/db'
import { getDb, inngest } from '@decade/exchange-runtime'
import { resolveActingBroker } from '@/lib/broker-identity'
import { submitOrderSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

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
  let broker
  try {
    broker = await resolveActingBroker(request)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    throw error
  }

  const body = parsed.data
  const db = getDb()

  const [inserted] = await db
    .insert(orders)
    .values({
      brokerId: broker.id,
      ownerDocument: body.ownerDocument,
      symbol: body.symbol,
      side: body.side,
      type: body.type,
      limitPriceCents: body.type === 'market' ? null : (body.limitPrice ?? null),
      quantity: body.quantity,
      remaining: body.quantity,
      status: 'open',
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    })
    .returning({ id: orders.id })

  if (!inserted) {
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }

  // Hand off to the matcher; it serializes per symbol so the book stays consistent.
  await inngest.send({
    name: 'order/submitted',
    data: { orderId: inserted.id, symbol: body.symbol },
  })

  return NextResponse.json({ orderId: inserted.id, status: 'open' }, { status: 201 })
}
