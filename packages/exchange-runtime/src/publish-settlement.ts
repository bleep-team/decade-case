import { and, eq, inArray } from 'drizzle-orm'
import { brokers, positions, type Database } from '@decade/db'
import type { MatchResult } from '@decade/matching-engine'
import type { Realtime } from '@inngest/realtime'
import { deriveBrokerUpdates, publishBrokerUpdate } from './realtime.js'

/**
 * Push a private realtime update to every broker a match touched. Reads each
 * affected broker's post-settlement cash and position in the traded symbol, then
 * projects the result into per-broker {@link BrokerUpdate}s and publishes them.
 *
 * Best-effort UI freshness: `publish` is the realtime helper injected by
 * `realtimeMiddleware()`. Public market data stays on REST polling, so a missing
 * realtime connection degrades cleanly to all-polling.
 */
export async function publishSettlement(
  publish: Realtime.PublishFn,
  db: Database,
  result: MatchResult,
  tradeIds: string[],
): Promise<void> {
  if (result.trades.length === 0) return

  const symbol = result.takerOrder.symbol
  const brokerIds = [
    ...new Set([result.takerOrder.brokerId, ...result.filledRestingOrders.map((o) => o.brokerId)]),
  ]

  const cashRows = await db
    .select({ id: brokers.id, cash: brokers.cashBalanceCents })
    .from(brokers)
    .where(inArray(brokers.id, brokerIds))
  const cashByBroker = new Map(cashRows.map((r) => [r.id, r.cash]))

  const positionRows = await db
    .select({ brokerId: positions.brokerId, quantity: positions.quantity })
    .from(positions)
    .where(and(inArray(positions.brokerId, brokerIds), eq(positions.symbol, symbol)))
  const positionByBroker = new Map(positionRows.map((r) => [r.brokerId, r.quantity]))

  const updates = deriveBrokerUpdates(result, tradeIds, {
    balanceOf: (id) => cashByBroker.get(id) ?? 0,
    positionOf: (id) => positionByBroker.get(id) ?? 0,
  })

  for (const { brokerId, update } of updates) {
    await publishBrokerUpdate(publish, brokerId, update)
  }
}
