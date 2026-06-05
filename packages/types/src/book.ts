import type { Cents } from './money.js'
import type { OrderSide } from './order.js'

/** One price level in the aggregated order book. */
export interface OrderBookLevel {
  price: Cents
  /** Total remaining quantity resting at this price. */
  quantity: number
  /** Number of distinct orders resting at this price. */
  orderCount: number
}

/** A snapshot of the top of book for one symbol. */
export interface OrderBookSnapshot {
  symbol: string
  /** Best bids first (highest price). */
  bids: OrderBookLevel[]
  /** Best asks first (lowest price). */
  asks: OrderBookLevel[]
}

export interface BookSide {
  side: OrderSide
  levels: OrderBookLevel[]
}
