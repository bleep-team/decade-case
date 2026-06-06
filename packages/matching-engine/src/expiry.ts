import type { Order } from '@decade/types'

/**
 * Drop orders whose validity window has closed at `now`.
 *
 * The matching engine is clock-free, so excluding expired orders is the
 * caller's job: it passes the wall-clock `now` and this pure helper filters the
 * resting book before matching. An order with a null `expiresAt` is
 * good-till-cancelled and always kept; one whose `expiresAt` is at or before
 * `now` is treated as expired and removed.
 *
 * `now` is an ISO timestamp so the comparison stays string-clock-agnostic and
 * the helper takes no dependency on `Date`.
 */
export function excludeExpired(orders: readonly Order[], now: string): Order[] {
  return orders.filter((order) => order.expiresAt === null || order.expiresAt > now)
}
