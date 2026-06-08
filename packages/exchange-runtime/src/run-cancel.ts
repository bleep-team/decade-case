import { eq } from 'drizzle-orm'
import { orders, type Database, type OrderRow } from '@decade/db'

/** An order is cancellable only while it still rests on the book. */
const CANCELLABLE = ['open', 'partially_filled'] as const

/**
 * Cancel an order, routed through the same per-symbol serialized writer as
 * matching so it is race-free against fills. Only `open`/`partially_filled`
 * orders transition to `cancelled` (preserving `remaining`); a cancel that loses
 * the race to a fill — or targets any already-terminal order — is a no-op that
 * leaves the final state untouched. Returns the order's resulting row, or null
 * when no such order exists.
 *
 * The market-maker and demo-reset reuse this same path.
 */
export async function runCancel(
  db: Database,
  orderId: string,
  now: Date = new Date(),
): Promise<OrderRow | null> {
  const [current] = await db.select().from(orders).where(eq(orders.id, orderId))
  if (!current) {
    return null
  }

  const cancellable = (CANCELLABLE as readonly string[]).includes(current.status)
  if (!cancellable) {
    return current
  }

  const [updated] = await db
    .update(orders)
    .set({ status: 'cancelled', updatedAt: now })
    .where(eq(orders.id, orderId))
    .returning()

  return updated ?? current
}
