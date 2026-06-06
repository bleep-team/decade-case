'use server'

import { eq } from 'drizzle-orm'
import { resolveOrCreateBroker } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { orders } from '@decade/db'
import { getDb, inngest } from '@decade/exchange-runtime'
import type { OrderTicketPayload } from '@/components/terminal/order-ticket'
import { submitOrderSchema } from '@/lib/validation'

/**
 * Submit an order on behalf of the signed-in broker. The acting broker is
 * resolved from the Clerk session — never the payload — then the order is
 * inserted `open` and handed to the per-symbol matcher, mirroring
 * `POST /api/orders`. Returns the new order id.
 */
export async function submitOrderAction(payload: OrderTicketPayload): Promise<{ orderId: string }> {
  const parsed = submitOrderSchema.parse({
    ownerDocument: payload.ownerDocument,
    symbol: payload.symbol,
    side: payload.side,
    type: payload.type,
    limitPrice: payload.type === 'market' ? null : payload.limitPrice,
    quantity: payload.quantity,
    expiresAt: payload.expiresAt,
  })

  const userId = await requireUserId()
  const db = getDb()
  const broker = await resolveOrCreateBroker(db, userId)

  const [inserted] = await db
    .insert(orders)
    .values({
      brokerId: broker.id,
      ownerDocument: parsed.ownerDocument,
      symbol: parsed.symbol,
      side: parsed.side,
      type: parsed.type,
      limitPriceCents: parsed.type === 'market' ? null : (parsed.limitPrice ?? null),
      quantity: parsed.quantity,
      remaining: parsed.quantity,
      status: 'open',
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    })
    .returning({ id: orders.id })

  if (!inserted) {
    throw new Error('order insert failed')
  }

  await inngest.send({
    name: 'order/submitted',
    data: { orderId: inserted.id, symbol: parsed.symbol },
  })

  return { orderId: inserted.id }
}

/**
 * Request cancellation of one of the signed-in broker's orders. Ownership is
 * checked against the Clerk-resolved broker; the cancel is enqueued through the
 * same per-symbol writer as matching, mirroring `POST /api/orders/:id/cancel`.
 */
export async function cancelOrderAction(orderId: string): Promise<void> {
  const userId = await requireUserId()
  const db = getDb()
  const broker = await resolveOrCreateBroker(db, userId)

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId))
  if (!order || order.brokerId !== broker.id) {
    throw new Error('order not found')
  }

  await inngest.send({
    name: 'order/cancel-requested',
    data: { orderId: order.id, symbol: order.symbol },
  })
}
