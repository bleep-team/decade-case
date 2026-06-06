import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  buildWebhookPayload,
  SIGNATURE_HEADER,
  signPayload,
  webhookHeaders,
} from './webhook.js'

const trade = {
  id: 'trd_1',
  symbol: 'AAPL',
  priceCents: 1000,
  quantity: 500,
  bidOrderId: 'ord_b',
  askOrderId: 'ord_a',
  executedAt: '2026-01-01T00:00:00.000Z',
}

describe('buildWebhookPayload', () => {
  it('shapes a trade into the public webhook payload', () => {
    expect(buildWebhookPayload(trade)).toEqual({
      event: 'trade.executed',
      tradeId: 'trd_1',
      symbol: 'AAPL',
      price: 1000,
      quantity: 500,
      bidOrderId: 'ord_b',
      askOrderId: 'ord_a',
      executedAt: '2026-01-01T00:00:00.000Z',
    })
  })
})

describe('signPayload', () => {
  it('is deterministic for the same secret and body', () => {
    const body = JSON.stringify(buildWebhookPayload(trade))
    expect(signPayload('whsec_1', body)).toBe(signPayload('whsec_1', body))
  })

  it('changes when the secret changes', () => {
    const body = JSON.stringify(buildWebhookPayload(trade))
    expect(signPayload('whsec_1', body)).not.toBe(signPayload('whsec_2', body))
  })
})

describe('webhookHeaders (the signed-delivery contract)', () => {
  it('carries the HMAC-SHA256 signature of the body in x-decade-signature', () => {
    const body = JSON.stringify(buildWebhookPayload(trade))
    const headers = webhookHeaders('whsec_1', body)

    expect(headers['content-type']).toBe('application/json')
    // The header is the raw-body HMAC a recipient recomputes to verify origin.
    const expected = createHmac('sha256', 'whsec_1').update(body).digest('hex')
    expect(headers[SIGNATURE_HEADER]).toBe(expected)
    expect(headers[SIGNATURE_HEADER]).toBe(signPayload('whsec_1', body))
  })
})
