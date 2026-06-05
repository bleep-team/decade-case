import { createHmac } from 'node:crypto'

export interface WebhookPayload {
  event: 'trade.executed'
  tradeId: string
  symbol: string
  /** Execution price in cents. */
  price: number
  quantity: number
  bidOrderId: string
  askOrderId: string
  executedAt: string
}

export interface TradeForWebhook {
  id: string
  symbol: string
  priceCents: number
  quantity: number
  bidOrderId: string
  askOrderId: string
  executedAt: string
}

export function buildWebhookPayload(trade: TradeForWebhook): WebhookPayload {
  return {
    event: 'trade.executed',
    tradeId: trade.id,
    symbol: trade.symbol,
    price: trade.priceCents,
    quantity: trade.quantity,
    bidOrderId: trade.bidOrderId,
    askOrderId: trade.askOrderId,
    executedAt: trade.executedAt,
  }
}

/** HMAC-SHA256 signature of the raw JSON body, sent as `x-decade-signature`. */
export function signPayload(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}
