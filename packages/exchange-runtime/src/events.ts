/** Emitted by the API after an order row is inserted as `open`. */
export type OrderSubmittedEvent = {
  data: { orderId: string; symbol: string }
}

/** Emitted by the matcher for each execution, to fan out webhook delivery. */
export type TradeExecutedEvent = {
  data: { tradeId: string }
}

// A `type` (not `interface`) so it satisfies Inngest's `Record<string, …>`
// schema constraint — interfaces lack the implicit string index signature.
export type ExchangeEvents = {
  'order/submitted': OrderSubmittedEvent
  'trade/executed': TradeExecutedEvent
}
