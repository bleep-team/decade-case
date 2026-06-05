import { and, eq, inArray } from 'drizzle-orm'
import { orders, toDomainOrder, type Database } from '@decade/db'
import { matchOrder } from '@decade/matching-engine'
import { persistMatchResult } from './persist.js'

/**
 * Load the incoming order and its resting book, run the pure matcher, and persist
 * the result. Returns the ids of any trades created.
 *
 * This is the heart of the match-order job, factored out of the Inngest wrapper
 * so it can be driven directly from an integration test against a real database.
 */
export async function runMatch(db: Database, orderId: string): Promise<string[]> {
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

  const result = matchOrder(toDomainOrder(incoming), bookRows.map(toDomainOrder))
  return persistMatchResult(db, result, new Date())
}
