'use server'

import { eq } from 'drizzle-orm'
import { resolveOrCreateBroker } from '@decade/auth'
import { requireUserId } from '@decade/auth/server'
import { orders } from '@decade/db'
import { getDb, inngest } from '@decade/exchange-runtime'
import type { OrderTicketPayload } from '@/components/terminal/order-ticket'
import { createOrder } from '@/lib/exchange-service'
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

  // Insert + buying-power check + matcher hand-off live in the shared service,
  // mirroring `POST /api/orders` exactly.
  const { orderId } = await createOrder(db, broker, parsed)
  return { orderId }
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
