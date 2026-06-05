import type { Cents, Order, OrderBookLevel, OrderBookSnapshot, OrderSide } from '@decade/types'

function isLive(order: Order): boolean {
  return order.remaining > 0 && (order.status === 'open' || order.status === 'partially_filled')
}

/** Aggregate one side of the book into price levels, best price first. */
function aggregate(orders: readonly Order[], side: OrderSide): OrderBookLevel[] {
  const byPrice = new Map<Cents, OrderBookLevel>()

  for (const order of orders) {
    if (order.limitPrice === null) continue
    const level = byPrice.get(order.limitPrice)
    if (level) {
      level.quantity += order.remaining
      level.orderCount += 1
    } else {
      byPrice.set(order.limitPrice, {
        price: order.limitPrice,
        quantity: order.remaining,
        orderCount: 1,
      })
    }
  }

  const levels = [...byPrice.values()]
  levels.sort((a, b) => (side === 'bid' ? b.price - a.price : a.price - b.price))
  return levels
}

/**
 * Build a top-of-book snapshot for a symbol from the live resting orders.
 * `depth` caps how many price levels are returned per side (default 10).
 */
export function buildOrderBook(
  symbol: string,
  restingOrders: readonly Order[],
  depth = 10,
): OrderBookSnapshot {
  const live = restingOrders.filter((order) => order.symbol === symbol && isLive(order))
  const bids = aggregate(
    live.filter((order) => order.side === 'bid'),
    'bid',
  ).slice(0, depth)
  const asks = aggregate(
    live.filter((order) => order.side === 'ask'),
    'ask',
  ).slice(0, depth)
  return { symbol, bids, asks }
}

/** Best (highest) bid price, or null if no bids rest. */
export function bestBid(snapshot: OrderBookSnapshot): Cents | null {
  return snapshot.bids[0]?.price ?? null
}

/** Best (lowest) ask price, or null if no asks rest. */
export function bestAsk(snapshot: OrderBookSnapshot): Cents | null {
  return snapshot.asks[0]?.price ?? null
}

/** Midpoint of best bid and best ask, or null if either side is empty. */
export function midpoint(snapshot: OrderBookSnapshot): Cents | null {
  const bid = bestBid(snapshot)
  const ask = bestAsk(snapshot)
  if (bid === null || ask === null) return null
  return Math.round((bid + ask) / 2)
}
