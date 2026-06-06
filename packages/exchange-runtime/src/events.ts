/** Emitted by the API after an order row is inserted as `open`. */
export type OrderSubmittedEvent = {
  data: { orderId: string; symbol: string }
}

/** Emitted by the matcher for each execution, to fan out webhook delivery. */
export type TradeExecutedEvent = {
  data: { tradeId: string }
}

/**
 * Emitted by the public cancel route (and the market-maker / demo-reset) to pull
 * a resting order. Carries `symbol` so the cancel serializes on the same
 * per-symbol writer as matching.
 */
export type OrderCancelRequestedEvent = {
  data: { orderId: string; symbol: string }
}

// A `type` (not `interface`) so it satisfies Inngest's `Record<string, …>`
// schema constraint — interfaces lack the implicit string index signature.
export type ExchangeEvents = {
  'order/submitted': OrderSubmittedEvent
  'trade/executed': TradeExecutedEvent
  'order/cancel-requested': OrderCancelRequestedEvent
}
