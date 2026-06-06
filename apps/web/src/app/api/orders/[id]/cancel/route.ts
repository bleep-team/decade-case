import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { UnauthorizedError } from '@decade/auth'
import { orders } from '@decade/db'
import { getDb, inngest } from '@decade/exchange-runtime'
import { resolveActingBroker } from '@/lib/broker-identity'

export const dynamic = 'force-dynamic'

/**
 * Request cancellation of an order. The acting broker must own the order. The
 * cancel is enqueued through the same per-symbol serialized writer as matching
 * and we respond immediately — cancellation is async/eventual like submit, so
 * the caller polls the order for its final state.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let broker
  try {
    broker = await resolveActingBroker(request)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    throw error
  }

  const db = getDb()
  const [order] = await db.select().from(orders).where(eq(orders.id, id))

  if (!order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Only the owning broker may cancel; don't leak existence to others.
  if (order.brokerId !== broker.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  await inngest.send({
    name: 'order/cancel-requested',
    data: { orderId: order.id, symbol: order.symbol },
  })

  // 202 Accepted: the cancel is queued, not yet applied.
  return NextResponse.json({ orderId: order.id, status: 'cancel_requested' }, { status: 202 })
}
