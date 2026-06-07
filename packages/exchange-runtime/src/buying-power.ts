import { and, eq, inArray, sql } from 'drizzle-orm'
import { orders, type Broker, type Database } from '@decade/db'

/** Just enough of an order to size the cash it would commit. */
export interface BuyingPowerOrder {
  side: 'bid' | 'ask'
  type: 'limit' | 'market'
  limitPriceCents: number | null
  quantity: number
}

/**
 * Cash the broker has not already committed to resting limit bids.
 *
 * We deliberately keep no held-funds ledger: the balance stays owned solely by
 * the matcher (`persistMatchResult`). Buying power is instead derived on demand
 * by summing the notional still working on the broker's open and partially-
 * filled limit bids, so this stays a read-only check with no second writer on
 * the cash balance.
 */
export async function availableBuyingPowerCents(
  db: Database,
  brokerId: string,
  cashBalanceCents: number,
): Promise<number> {
  const [row] = await db
    .select({
      committed: sql<string>`coalesce(sum(${orders.limitPriceCents} * ${orders.remaining}), 0)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.brokerId, brokerId),
        eq(orders.side, 'bid'),
        eq(orders.type, 'limit'),
        inArray(orders.status, ['open', 'partially_filled']),
      ),
    )
  return cashBalanceCents - Number(row?.committed ?? 0)
}

/**
 * Whether the broker can place `order` without committing more cash than it has
 * free. Only a **limit buy** reserves cash up front; a sell needs no cash and a
 * market buy has no price until it executes, so both are left to the matcher's
 * execution-time `truncate` — which also backstops the (narrow) concurrent-
 * submit race here. Returns `true` for everything this does not gate.
 */
export async function hasBuyingPowerFor(
  db: Database,
  broker: Broker,
  order: BuyingPowerOrder,
): Promise<boolean> {
  if (order.side !== 'bid' || order.type !== 'limit' || order.limitPriceCents === null) {
    return true
  }
  const requiredCents = order.limitPriceCents * order.quantity
  const availableCents = await availableBuyingPowerCents(db, broker.id, broker.cashBalanceCents)
  return requiredCents <= availableCents
}
