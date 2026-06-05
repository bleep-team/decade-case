import type { Cents } from './money.js'
import type { BrokerId, OrderId } from './order.js'

export type TradeId = string

/**
 * A settled execution between a bid and an ask. Per the exchange rules the
 * execution `price` is always the seller's (ask) price when the two cross.
 */
export interface Trade {
  id: TradeId
  symbol: string
  price: Cents
  quantity: number
  bidOrderId: OrderId
  askOrderId: OrderId
  bidBrokerId: BrokerId
  askBrokerId: BrokerId
  executedAt: string
}
