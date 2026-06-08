import { eq, sql } from 'drizzle-orm'
import { brokers, orders, positions, trades, type Database } from '@decade/db'
import type { MatchResult } from '@decade/matching-engine'
import { computeSettlementDeltas } from './settlement.js'

/**
 * Persist a `MatchResult` atomically and return the ids of any trades created.
 *
 * When there are no trades the taker's new state (e.g. a rested limit order, a
 * cancelled market remainder, or a budget-rejected buy) is written directly.
 * When there are trades, the taker update, every resting-order update, all trade
 * inserts, and both sides' cash *and* position moves run inside a single
 * transaction so an execution is all-or-nothing — broker-level double-entry, so
 * total cash and total shares are conserved on every fill.
 */
export async function persistMatchResult(
  db: Database,
  result: MatchResult,
  now: Date,
): Promise<string[]> {
  if (result.trades.length === 0) {
    await db
      .update(orders)
      .set({
        remaining: result.takerOrder.remaining,
        status: result.takerOrder.status,
        updatedAt: now,
      })
      .where(eq(orders.id, result.takerOrder.id))
    return []
  }

  return db.transaction(async (tx) => {
    const tradeIds: string[] = []

    await tx
      .update(orders)
      .set({
        remaining: result.takerOrder.remaining,
        status: result.takerOrder.status,
        updatedAt: now,
      })
      .where(eq(orders.id, result.takerOrder.id))

    for (const resting of result.filledRestingOrders) {
      await tx
        .update(orders)
        .set({ remaining: resting.remaining, status: resting.status, updatedAt: now })
        .where(eq(orders.id, resting.id))
    }

    for (const trade of result.trades) {
      const inserted = await tx
        .insert(trades)
        .values({
          symbol: trade.symbol,
          priceCents: trade.price,
          quantity: trade.quantity,
          bidOrderId: trade.bidOrderId,
          askOrderId: trade.askOrderId,
          bidBrokerId: trade.bidBrokerId,
          askBrokerId: trade.askBrokerId,
          executedAt: now,
        })
        .returning({ id: trades.id })

      const tradeId = inserted[0]?.id
      if (tradeId) {
        tradeIds.push(tradeId)
      }
    }

    // Apply both legs of double-entry from the pure settlement decision: cash on
    // brokers, signed share positions on `(broker, symbol)`.
    const deltas = computeSettlementDeltas(result)

    for (const move of deltas.cash) {
      await tx
        .update(brokers)
        .set({
          cashBalanceCents: sql`${brokers.cashBalanceCents} + ${move.deltaCents}`,
          updatedAt: now,
        })
        .where(eq(brokers.id, move.brokerId))
    }

    for (const move of deltas.positions) {
      await tx
        .insert(positions)
        .values({ brokerId: move.brokerId, symbol: move.symbol, quantity: move.deltaQuantity })
        .onConflictDoUpdate({
          target: [positions.brokerId, positions.symbol],
          set: { quantity: sql`${positions.quantity} + ${move.deltaQuantity}`, updatedAt: now },
        })
    }

    return tradeIds
  })
}
