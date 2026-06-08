import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  attemptWebhookDelivery,
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

describe('attemptWebhookDelivery', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reports a single delivered attempt on a 2xx response', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const outcome = await attemptWebhookDelivery({ url: 'https://hook.test', secret: 's' }, '{}')

    expect(outcome).toEqual({ status: 'delivered', attempts: 1, lastError: null })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries to the limit and reports failed with the last error on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 })),
    )

    const outcome = await attemptWebhookDelivery({ url: 'https://hook.test', secret: 's' }, '{}', 3)

    expect(outcome.status).toBe('failed')
    expect(outcome.attempts).toBe(3)
    expect(outcome.lastError).toContain('500')
  })

  it('captures a network error as the last error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED')
      }),
    )

    const outcome = await attemptWebhookDelivery({ url: 'https://hook.test', secret: 's' }, '{}', 2)

    expect(outcome.status).toBe('failed')
    expect(outcome.attempts).toBe(2)
    expect(outcome.lastError).toContain('ECONNREFUSED')
  })
})
