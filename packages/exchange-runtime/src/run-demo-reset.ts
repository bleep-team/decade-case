import { and, eq, inArray } from 'drizzle-orm'
import { brokers, orders, positions, type Database } from '@decade/db'
import { runCancel } from './run-cancel.js'

/** Orders still resting on the book — the ones a reset pulls. */
const RESTING = ['open', 'partially_filled'] as const

export interface DemoResetResult {
  brokerId: string
  /** Ids of the orders this reset transitioned to `cancelled`. */
  cancelledOrderIds: string[]
  /** The broker's cash balance after the reset (the restored starting cash). */
  cashBalanceCents: number
}

/**
 * Reset a broker to a clean demo slate: cancel every resting order through the
 * shared {@link runCancel} path, flatten its positions to nothing, and restore
 * the configured starting cash. Already-terminal orders (filled/expired/…) are
 * left untouched. The caller supplies the starting balance so this stays
 * decoupled from the auth package that owns that constant.
 */
export async function runDemoReset(
  db: Database,
  brokerId: string,
  startingBalanceCents: number,
  now: Date = new Date(),
): Promise<DemoResetResult> {
  const resting = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.brokerId, brokerId), inArray(orders.status, [...RESTING])))

  const cancelledOrderIds: string[] = []
  for (const { id } of resting) {
    const result = await runCancel(db, id, now)
    if (result?.status === 'cancelled') {
      cancelledOrderIds.push(id)
    }
  }

  // A clean re-run starts flat: drop the broker's holdings.
  await db.delete(positions).where(eq(positions.brokerId, brokerId))

  const [updated] = await db
    .update(brokers)
    .set({ cashBalanceCents: startingBalanceCents, updatedAt: now })
    .where(eq(brokers.id, brokerId))
    .returning({ cashBalanceCents: brokers.cashBalanceCents })

  return {
    brokerId,
    cancelledOrderIds,
    cashBalanceCents: updated?.cashBalanceCents ?? startingBalanceCents,
  }
}
