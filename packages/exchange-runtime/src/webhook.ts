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

/** The header name carrying the HMAC-SHA256 signature of the body. */
export const SIGNATURE_HEADER = 'x-decade-signature'

/**
 * Headers for a signed webhook POST: JSON content type plus the
 * `x-decade-signature` HMAC of the exact body bytes. Shared by the delivery job
 * and its test so the signed-request contract is asserted in one place.
 */
export function webhookHeaders(secret: string, body: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    [SIGNATURE_HEADER]: signPayload(secret, body),
  }
}
