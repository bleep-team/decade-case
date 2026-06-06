import type { Cents } from './money.js'

export type BrokerId = string
export type OrderId = string

/** Bid = buy (willing to pay up to a max). Ask = sell (willing to sell at a min). */
export type OrderSide = 'bid' | 'ask'

/** Limit orders carry a price; market orders take the best available price. */
export type OrderType = 'limit' | 'market'

export type OrderStatus =
  | 'open'
  | 'partially_filled'
  | 'filled'
  | 'cancelled'
  | 'expired'
  | 'rejected'

/** What a broker submits on behalf of one of their customers. */
export interface SubmitOrderInput {
  brokerId: BrokerId
  /** Document number of the customer who owns the order. */
  ownerDocument: string
  symbol: string
  side: OrderSide
  type: OrderType
  /** Integer cents. Required for `limit`, must be null/absent for `market`. */
  limitPrice: Cents | null
  quantity: number
  /** ISO timestamp after which the order is no longer valid. Null = good-till-cancelled. */
  expiresAt: string | null
}

/** A persisted, identifiable order with live matching state. */
export interface Order {
  id: OrderId
  brokerId: BrokerId
  ownerDocument: string
  symbol: string
  side: OrderSide
  type: OrderType
  limitPrice: Cents | null
  /** Original requested quantity, in whole shares. */
  quantity: number
  /** Unfilled quantity remaining on the book. */
  remaining: number
  status: OrderStatus
  /**
   * Global monotonic submission counter. Lower = submitted earlier; used as the
   * tiebreaker so equal-priced orders resolve in chronological order.
   */
  sequence: number
  createdAt: string
  expiresAt: string | null
}
