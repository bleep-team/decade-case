import { describe, expect, it } from 'vitest'
import { buildWebhookPayload, signPayload } from './webhook.js'

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
