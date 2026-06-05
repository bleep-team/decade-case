import type { Cents, Order, OrderSide, OrderStatus } from '@decade/types'
import { restingPriority } from './priority.js'

/**
 * An execution proposed by the matcher. It carries no id or timestamp — the
 * runtime assigns those when it persists the trade inside the same transaction
 * that updates the orders, so the pure engine stays deterministic.
 */
export interface ProposedTrade {
  symbol: string
  /** Execution price in integer cents — always the seller's (ask) price when both cross. */
  price: Cents
  quantity: number
  bidOrderId: string
  askOrderId: string
  bidBrokerId: string
  askBrokerId: string
}

export interface MatchResult {
  /** Executions produced, in the chronological order they occurred. */
  trades: ProposedTrade[]
  /**
   * The incoming order with its post-match `remaining` and `status`. A limit
   * order with `status` `open`/`partially_filled` should be inserted/kept on the
   * book by the caller; a market order is never rested.
   */
  takerOrder: Order
  /** Resting orders that were (partially) filled, with updated `remaining`/`status`. */
  filledRestingOrders: Order[]
}

/** A market order on either side crosses any opposite order; two limits cross on price. */
function crosses(bid: Order, ask: Order): boolean {
  if (bid.type === 'market' || ask.type === 'market') return true
  if (bid.limitPrice === null || ask.limitPrice === null) return false
  return bid.limitPrice >= ask.limitPrice
}

/**
 * Execution price for a crossing pair. The exchange rule is "use the seller's
 * price", so for two limit orders it is the ask's limit price. When the ask is a
 * market order (it has no price of its own), we fall back to the bid's limit
 * price as the best available reference.
 */
function executionPrice(bid: Order, ask: Order): Cents | null {
  if (ask.type === 'limit' && ask.limitPrice !== null) return ask.limitPrice
  if (bid.type === 'limit' && bid.limitPrice !== null) return bid.limitPrice
  return null
}

function applyFill(order: Order, quantity: number): Order {
  const remaining = Math.max(0, order.remaining - quantity)
  const status: OrderStatus = remaining === 0 ? 'filled' : 'partially_filled'
  return { ...order, remaining, status }
}

/** Resolve the final status of the taker once no more liquidity is reachable. */
function settleTaker(taker: Order): Order {
  if (taker.remaining === 0) return { ...taker, status: 'filled' }
  if (taker.type === 'market') {
    // Market orders never rest — the unfilled remainder is cancelled.
    return { ...taker, status: 'cancelled' }
  }
  const filledSome = taker.remaining < taker.quantity
  return { ...taker, status: filledSome ? 'partially_filled' : 'open' }
}

/**
 * Match an incoming order against the resting book for its symbol.
 *
 * The caller passes the live resting orders (the engine defensively filters to
 * the opposite side, same symbol, with remaining quantity) — and is responsible
 * for excluding expired orders, since the engine is clock-free and deterministic.
 *
 * Matching walks the opposite side in price-time priority, executing at the
 * seller's price, producing partial fills until the taker is exhausted or no
 * resting order crosses.
 */
export function matchOrder(incoming: Order, restingBook: readonly Order[]): MatchResult {
  const trades: ProposedTrade[] = []
  const filledRestingOrders: Order[] = []

  const oppositeSide: OrderSide = incoming.side === 'bid' ? 'ask' : 'bid'
  const candidates = restingBook
    .filter(
      (order) =>
        order.symbol === incoming.symbol &&
        order.side === oppositeSide &&
        order.remaining > 0 &&
        (order.status === 'open' || order.status === 'partially_filled'),
    )
    .sort(restingPriority(oppositeSide))

  let taker: Order = { ...incoming }

  for (const candidate of candidates) {
    if (taker.remaining <= 0) break

    const bid = taker.side === 'bid' ? taker : candidate
    const ask = taker.side === 'ask' ? taker : candidate

    // Candidates are sorted best-price-first, so the first non-crossing order
    // means nothing further can cross either.
    if (!crosses(bid, ask)) break

    const price = executionPrice(bid, ask)
    if (price === null) break

    const quantity = Math.min(taker.remaining, candidate.remaining)

    trades.push({
      symbol: incoming.symbol,
      price,
      quantity,
      bidOrderId: bid.id,
      askOrderId: ask.id,
      bidBrokerId: bid.brokerId,
      askBrokerId: ask.brokerId,
    })

    taker = applyFill(taker, quantity)
    filledRestingOrders.push(applyFill(candidate, quantity))
  }

  return { trades, takerOrder: settleTaker(taker), filledRestingOrders }
}
