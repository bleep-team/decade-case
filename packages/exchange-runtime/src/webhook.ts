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

/** The result of attempting delivery to one endpoint, recorded as a delivery row. */
export interface WebhookDeliveryOutcome {
  status: 'delivered' | 'failed'
  /** How many POSTs were made (1 on first success; `maxAttempts` when it fails). */
  attempts: number
  /** The last error message when failed; null when delivered. */
  lastError: string | null
}

/**
 * POST a signed webhook body to one endpoint, retrying up to `maxAttempts` on a
 * network error or non-2xx response. Returns the outcome — delivered, or failed
 * with the attempt count and last error — so the caller records it. Crucially it
 * reports *failures* too: the delivery log needs them, and the previous job only
 * persisted successes, leaving failed deliveries invisible.
 */
export async function attemptWebhookDelivery(
  endpoint: { url: string; secret: string },
  body: string,
  maxAttempts = 4,
): Promise<WebhookDeliveryOutcome> {
  let attempts = 0
  let lastError: string | null = null

  while (attempts < maxAttempts) {
    attempts += 1
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: webhookHeaders(endpoint.secret, body),
        body,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return { status: 'delivered', attempts, lastError: null }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
  }

  return { status: 'failed', attempts, lastError }
}
