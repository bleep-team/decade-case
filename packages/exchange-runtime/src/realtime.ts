import { channel, topic, type Realtime } from '@inngest/realtime'
import type { Order, OrderSide, OrderStatus } from '@decade/types'
import type { MatchResult } from '@decade/matching-engine'

/** One execution as it concerns a single broker (the side it traded on). */
export interface FillInfo {
  tradeId: string
  symbol: string
  /** Execution price in integer cents. */
  price: number
  quantity: number
  /** The side this broker traded on for this fill. */
  side: OrderSide
}

/** The post-match snapshot of one of a broker's orders. */
export interface OrderSnapshot {
  id: string
  symbol: string
  side: OrderSide
  status: OrderStatus
  remaining: number
}

/**
 * A private settlement update pushed to one broker. It carries the order whose
 * state changed, the fills it took, the broker's cash balance, and its position
 * in the traded symbol — everything the terminal needs to reflect a fill live.
 */
export interface BrokerUpdate {
  order: OrderSnapshot
  fills: FillInfo[]
  /** The broker's cash balance after settlement, in integer cents. */
  balanceCents: number
  /** The broker's signed position in the traded symbol after settlement. */
  position: { symbol: string; quantity: number } | null
}

/**
 * Private per-broker realtime channel. Each broker subscribes only to its own
 * `broker:<id>` channel; public market data stays on REST polling. A single
 * `updates` topic carries every {@link BrokerUpdate}.
 */
export const brokerChannel = channel((brokerId: string) => `broker:${brokerId}`).addTopic(
  topic('updates').type<BrokerUpdate>(),
)

/**
 * Publish a private {@link BrokerUpdate} to a broker's channel. `publish` is the
 * function `realtimeMiddleware()` injects into an Inngest function's context;
 * passing it in keeps this helper pure and spy-able in tests.
 */
export async function publishBrokerUpdate(
  publish: Realtime.PublishFn,
  brokerId: string,
  update: BrokerUpdate,
): Promise<void> {
  await publish(brokerChannel(brokerId).updates(update))
}

/** Cash / position lookups resolved by the caller after a transaction settles. */
export interface SettlementSnapshots {
  /** Broker's cash balance in cents (post-settlement). */
  balanceOf: (brokerId: string) => number
  /** Broker's signed position in the traded symbol (post-settlement), or 0. */
  positionOf: (brokerId: string) => number
}

/**
 * Pure projection of a settled {@link MatchResult} into one {@link BrokerUpdate}
 * per affected order. `tradeIds` are aligned by index with `result.trades` (the
 * order `persistMatchResult` inserts them). Each broker sees its own order's new
 * state, only the fills on that order, and its balance/position snapshot.
 */
export function deriveBrokerUpdates(
  result: MatchResult,
  tradeIds: string[],
  snapshots: SettlementSnapshots,
): Array<{ brokerId: string; update: BrokerUpdate }> {
  const fillFor = (tradeIndex: number, side: OrderSide): FillInfo => {
    const t = result.trades[tradeIndex]!
    return { tradeId: tradeIds[tradeIndex]!, symbol: t.symbol, price: t.price, quantity: t.quantity, side }
  }

  const updateFor = (
    order: Order,
    fills: FillInfo[],
  ): { brokerId: string; update: BrokerUpdate } => ({
    brokerId: order.brokerId,
    update: {
      order: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        status: order.status,
        remaining: order.remaining,
      },
      fills,
      balanceCents: snapshots.balanceOf(order.brokerId),
      position: { symbol: order.symbol, quantity: snapshots.positionOf(order.brokerId) },
    },
  })

  // The taker is party to every trade in the result.
  const taker = result.takerOrder
  const takerFills = result.trades.map((_, i) => fillFor(i, taker.side))
  const updates = [updateFor(taker, takerFills)]

  for (const resting of result.filledRestingOrders) {
    const fills = result.trades
      .map((t, i) =>
        t.bidOrderId === resting.id || t.askOrderId === resting.id ? fillFor(i, resting.side) : null,
      )
      .filter((f): f is FillInfo => f !== null)
    updates.push(updateFor(resting, fills))
  }

  return updates
}
