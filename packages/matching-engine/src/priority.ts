import type { Order, OrderSide } from '@decade/types'

/**
 * Comparator for the resting side of the book, in match priority order.
 *
 * Resting orders are always limit orders (market orders never rest). We always
 * match against the *best* price first, and break price ties in chronological
 * order via the monotonic `sequence`:
 *
 * - resting asks  → lowest price first, then earliest (ascending price)
 * - resting bids  → highest price first, then earliest (descending price)
 */
export function restingPriority(restingSide: OrderSide): (a: Order, b: Order) => number {
  return (a, b) => {
    const priceA = a.limitPrice ?? 0
    const priceB = b.limitPrice ?? 0
    if (priceA !== priceB) {
      return restingSide === 'ask' ? priceA - priceB : priceB - priceA
    }
    return a.sequence - b.sequence
  }
}
