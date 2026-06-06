import { and, eq, inArray } from 'drizzle-orm'
import { brokers, orders, toDomainOrder, type Database } from '@decade/db'
import {
  excludeExpired,
  matchOrder,
  truncateToBudget,
  type MatchResult,
} from '@decade/matching-engine'
import { persistMatchResult } from './persist.js'

/**
 * Load the incoming order and its resting book, run the pure matcher, enforce
 * the cash leg, and persist the result. Returns the ids of any trades created.
 *
 * This is the heart of the match-order job, factored out of the Inngest wrapper
 * so it can be driven directly from an integration test against a database.
 *
 * `now` is injected (defaults to wall-clock) so expiry exclusion is
 * deterministic in tests; the pure engine stays clock-free.
 */
export async function runMatch(
  db: Database,
  orderId: string,
  now: Date = new Date(),
): Promise<string[]> {
  const incomingRows = await db.select().from(orders).where(eq(orders.id, orderId))
  const incoming = incomingRows[0]
  if (!incoming || incoming.status !== 'open') {
    return []
  }

  const oppositeSide = incoming.side === 'bid' ? 'ask' : 'bid'
  const bookRows = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.symbol, incoming.symbol),
        eq(orders.side, oppositeSide),
        inArray(orders.status, ['open', 'partially_filled']),
      ),
    )

  // Exclude orders past their validity window before matching — the engine is
  // clock-free, so this is the caller's responsibility.
  const restingBook = excludeExpired(bookRows.map(toDomainOrder), now.toISOString())

  let result = matchOrder(toDomainOrder(incoming), restingBook)

  // Cash-leg enforcement: a buyer settles only the prefix of fills its cash
  // covers. Shorts are permissive (the seller may go negative), but a buyer
  // never settles into a negative balance.
  if (incoming.side === 'bid') {
    result = enforceBudget(result, await availableCash(db, incoming.brokerId))
  }

  return persistMatchResult(db, result, now)
}

/** The buyer broker's spendable cash in integer cents (0 if the broker is gone). */
async function availableCash(db: Database, brokerId: string): Promise<number> {
  const rows = await db
    .select({ cash: brokers.cashBalanceCents })
    .from(brokers)
    .where(eq(brokers.id, brokerId))
  return rows[0]?.cash ?? 0
}

/**
 * Trim a buy result to the affordable prefix. When the budget covers everything
 * `truncateToBudget` returns the result unchanged (the limit remainder, if any,
 * rests as the engine decided). When the budget binds it cuts at the boundary
 * and the uncovered remainder is `rejected` — it never traded, distinct from a
 * market remainder `cancelled` for want of liquidity.
 */
function enforceBudget(result: MatchResult, cashCents: number): MatchResult {
  const truncated = truncateToBudget(result, cashCents)
  if (truncated === result) return result
  const { takerOrder } = truncated
  if (takerOrder.remaining === 0) return truncated
  return { ...truncated, takerOrder: { ...takerOrder, status: 'rejected' } }
}
